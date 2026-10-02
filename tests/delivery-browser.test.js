"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm"), fs = require("node:fs");
const source = file => fs.readFileSync(`public/js/pages/delivery/${file}.js`,"utf8");
const settle = async () => { for (let i=0;i<15;i++) await new Promise(resolve => setImmediate(resolve)); };
function element() { return { hidden: false, disabled: false, textContent: "", events: {}, addEventListener(name,fn) { this.events[name]=fn; } }; }
function driverHarness() {
    const elements = Object.fromEntries(["startGps","stopGps","refreshRoute","gpsStatus","routeStatus"].map(id => [id,element()]));
    const calls = [], updates = [], gps = [], intervals = new Set();
    const route = { polyline: "route", destino: { latitude: -23.6, longitude: -46.5 } };
    const context = { URLSearchParams, AbortSignal, Date, console,
        location: { hash: "#"+"a".repeat(64), pathname: "/entregador" }, history: { replaceState() {} },
        document: { hidden: false, getElementById: id => elements[id], addEventListener() {} },
        navigator: { geolocation: { getCurrentPosition(resolve,reject) { gps.push({resolve,reject}); } } },
        isSecureContext: true, addEventListener() {},
        setInterval(fn) { intervals.add(fn); return fn; }, clearInterval(fn) { intervals.delete(fn); },
        PetFlowDeliveryMap: () => ({ update(data) { updates.push(JSON.parse(JSON.stringify(data))); }, hide() {} }),
        fetch: async (url,options) => {
            calls.push({url,options});
            const data = url.endsWith("/viagem") ? { id: "order", endereco_entrega: { endereco: "Rua", numero: "123" } } : url.endsWith("/rota") ? route : {};
            return { ok: true, json: async () => ({data}) };
        }
    };
    context.window = context; vm.runInNewContext(source("driver"),context);
    return { context,elements,calls,updates,gps,intervals };
}
test("iniciar viagem solicita permissão, publica GPS e mostra a rota compartilhada", async () => {
    const h = driverHarness();
    assert.equal(h.calls.length,0,"Não transmite GPS antes do clique");
    await h.elements.startGps.events.click();
    assert.equal(h.gps.length,1);
    h.gps[0].resolve({coords:{latitude:-23.66,longitude:-46.55,accuracy:10}}); await settle();
    assert.ok(h.calls.some(c=>c.url.endsWith("/localizacao") && c.options.method === "POST"));
    assert.equal(h.updates.at(-1).rota.polyline,"route");
    assert.equal(h.updates.at(-1).latitude,-23.66);
    assert.ok(h.elements.gpsStatus.textContent.includes("Viagem em andamento"));
    await h.elements.stopGps.events.click();
    assert.equal(h.intervals.size,0);
    assert.equal(h.calls.at(-1).options.method,"DELETE");
    assert.equal(h.elements.startGps.disabled,true);
});
test("encerrar enquanto aguarda GPS impede envio tardio da posição", async () => {
    const h = driverHarness(); await h.elements.startGps.events.click();
    await h.elements.stopGps.events.click();
    h.gps[0].resolve({coords:{latitude:-23.66,longitude:-46.55,accuracy:10}}); await settle();
    assert.equal(h.calls.filter(c=>c.options.method === "POST").length,0);
});
test("permissão negada permite tentar novamente e link expirado não solicita GPS", async () => {
    const h = driverHarness(); await h.elements.startGps.events.click();
    h.gps[0].reject({code:1}); await settle();
    assert.equal(h.elements.startGps.disabled,false);
    assert.equal(h.intervals.size,0);
    const expired = driverHarness();
    expired.context.fetch = async () => ({ok:false,status:410,json:async()=>({message:"Link encerrado"})});
    await expired.elements.startGps.events.click();
    assert.equal(expired.gps.length,0); assert.equal(expired.elements.startGps.disabled,true);
});
test("cliente exibe última posição com alerta de atraso e remove mapa ao concluir", async () => {
    const elements = Object.fromEntries(["trackingStatus","trackingUpdated","trackingLogin"].map(id=>[id,element()]));
    const updates=[]; let hides=0, tick;
    let data={status:"SAIU_PARA_ENTREGA",latitude:-23.66,longitude:-46.55,precisao_m:12,atualizado_em:new Date(Date.now()-180000).toISOString(),rota:{polyline:"route"}};
    const ctx={URLSearchParams,AbortSignal,Date,location:{search:"?pedido=example",pathname:"/acompanhar-entrega"},document:{hidden:false,getElementById:id=>elements[id],addEventListener(){}},sessionStorage:{getItem:()=>"token"},setInterval(fn){tick=fn;},PetFlowDeliveryMap:()=>({update(d){updates.push(d);},hide(){hides++;}}),fetch:async()=>({ok:true,json:async()=>({data})})};
    ctx.window=ctx;vm.runInNewContext(source("tracking"),ctx);await settle();
    assert.equal(updates.at(-1).rota.polyline,"route");assert.match(elements.trackingStatus.textContent,/Sem atualização recente/);
    data={status:"ENTREGUE"};await tick();assert.match(elements.trackingStatus.textContent,/Pedido entregue/);assert.equal(hides,1);
});
test("mapa Google mantém posição e rota e não ressuscita após encerrar carregamento pendente", async () => {
    const elements=Object.fromEntries(["deliveryMap","mapStatus","mapsLink","destinationAddress"].map(id=>[id,element()]));
    const paths=[], centers=[]; let ready;
    const ctx={URLSearchParams,console,setTimeout,clearTimeout,document:{getElementById:id=>elements[id],createElement:()=>({}),head:{appendChild(){ready=()=>ctx.petflowMapsReady();}}},fetch:async()=>({ok:true,json:async()=>({data:{browserKey:"public-key"}})}),google:{maps:{Map:class{fitBounds(){}getZoom(){return 15;}addListener(){}},Circle:class{setCenter(p){centers.push(p);}setRadius(){}},Polyline:class{setPath(p){paths.push(p);}},LatLngBounds:class{extend(){}},geometry:{encoding:{decodePath:()=>[{lat:-23,lng:-46}]}}}}};
    ctx.window=ctx;vm.runInNewContext(source("map"),ctx);
    const map=ctx.PetFlowDeliveryMap();
    const data={latitude:-23.66,longitude:-46.55,precisao_m:10,endereco_entrega:{endereco:"Rua",numero:"123"},rota:{polyline:"route",destino:{latitude:-23.67,longitude:-46.56}}};
    const pending=map.update(data);await settle();map.hide();ready();await pending;
    assert.equal(elements.deliveryMap.hidden,true);
    await map.update(data);assert.equal(elements.deliveryMap.hidden,false);assert.equal(paths.length,1);assert.equal(centers.at(-1).lat,-23.67);
    await map.update({...data,latitude:-23.65});assert.equal(paths.length,1,"Não recria rota nem reinicia zoom a cada GPS");assert.equal(centers.at(-1).lat,-23.65);
});
