"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm"), fs = require("node:fs");
const source = file => fs.readFileSync(`public/js/pages/delivery/${file}.js`,"utf8");
const settle = async () => { for (let i=0;i<15;i++) await new Promise(resolve => setImmediate(resolve)); };
function element() { return { hidden: false, disabled: false, textContent: "", events: {}, addEventListener(name,fn) { this.events[name]=fn; }, removeAttribute(name) { delete this[name]; } }; }
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
    assert.equal(h.calls.filter(c=>c.url.endsWith("/localizacao") && c.options.method === "POST").length,0);
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
function adminTrackingHarness(token = "admin-session") {
    const elements = Object.fromEntries(["trackingStatus","trackingUpdated","trackingLogin","trackingBack","trackingTitle","trackingDescription"].map(id => [id,element()]));
    const calls = [], updates = []; let hides = 0, tick;
    let data = {status:"SAIU_PARA_ENTREGA",latitude:null,longitude:null,atualizado_em:null};
    const ctx = {URLSearchParams,AbortSignal,Date,
        location:{search:"?pedido=example",pathname:"/admin/acompanhar-entrega"},
        document:{hidden:false,getElementById:id=>elements[id],addEventListener(){}},
        sessionStorage:{getItem:key=>key === "token" ? token : "customer-session"},
        navigator:{geolocation:{getCurrentPosition(){assert.fail("Administrador não deve solicitar GPS");},watchPosition(){assert.fail("Administrador não deve acompanhar seu próprio GPS");}}},
        setInterval(fn,delay){assert.equal(delay,15000);tick=fn;},
        PetFlowDeliveryMap:()=>({update(d){updates.push(d);},hide(){hides++;}}),
        fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({data})};}
    };
    ctx.window=ctx; vm.runInNewContext(source("tracking"),ctx);
    return {elements,calls,updates,ctx,setData(value){data=value;},tick:()=>tick(),hides:()=>hides};
}
test("administrador acompanha GPS do entregador sem publicar localização e encerra ao entregar", async () => {
    const h=adminTrackingHarness(); await settle();
    assert.match(h.elements.trackingStatus.textContent,/Aguardando o entregador/);
    assert.equal(h.updates.length,0);
    assert.equal(h.elements.trackingBack.href,"/admin/pages/vendas/vendas.html?pedido=example");
    h.setData({...routeData(),status:"SAIU_PARA_ENTREGA",atualizado_em:new Date().toISOString()});
    await h.tick(); assert.equal(h.updates.at(-1).latitude,-23.66);
    h.setData({...routeData(),latitude:-23.65,status:"SAIU_PARA_ENTREGA",atualizado_em:new Date().toISOString()});
    await h.tick(); assert.equal(h.updates.at(-1).latitude,-23.65);
    h.ctx.document.hidden=true; await h.tick(); assert.equal(h.calls.length,3,"Pausa atualizações enquanto a página está oculta");
    h.ctx.document.hidden=false;
    h.setData({status:"ENTREGUE"});await h.tick();
    assert.match(h.elements.trackingStatus.textContent,/Rastreamento encerrado/);
    assert.equal(h.hides(),2);
    await h.tick();assert.equal(h.calls.length,4,"Para consultas após concluir a entrega");
    for (const call of h.calls) {
        assert.equal(call.url,"/api/vendas/example/rastreamento");
        assert.equal(call.options.method || "GET","GET");
        assert.equal(call.options.headers.Authorization,"Bearer admin-session");
    }
});
test("sessão de cliente não permite abrir acompanhamento administrativo", async () => {
    const h=adminTrackingHarness(null);await settle();
    assert.equal(h.calls.length,0);
    assert.equal(h.elements.trackingLogin.hidden,false);
    assert.equal(h.elements.trackingLogin.href,"/admin/index.html");
    assert.match(h.elements.trackingStatus.textContent,/Entre no painel administrativo/);
});
function mapHarness() {
    const elements=Object.fromEntries(["deliveryMap","mapStatus","originAddress","destinationAddress"].map(id=>[id,element()]));
    const paths=[], centers=[], vehicles=[], circles=[]; let ready;
    const domElement = () => ({ ...element(), style: {}, children: [], setAttribute() {}, appendChild(child) { this.children.push(child); }, remove() {} });
    const ctx={URLSearchParams,console,setTimeout,clearTimeout,document:{getElementById:id=>elements[id],createElement:domElement,head:{appendChild(){ready=()=>ctx.petflowMapsReady();}}},fetch:async()=>({ok:true,json:async()=>({data:{browserKey:"public-key"}})}),google:{maps:{
        Map:class{fitBounds(){}getZoom(){return 15;}addListener(){}},
        Circle:class{constructor(){circles.push(this);}setCenter(p){this.center=p;centers.push(p);}setRadius(){}setVisible(v){this.visible=v;}},
        OverlayView:class{setMap(){vehicles.push(this);this.onAdd();}getPanes(){return{overlayMouseTarget:{appendChild(){}}};}getProjection(){return{fromLatLngToDivPixel:p=>({x:p.lng*100,y:p.lat*100})};}},
        LatLng:class{constructor(p){Object.assign(this,p);}},
        Polyline:class{setPath(p){paths.push(p);}},LatLngBounds:class{extend(){}},geometry:{encoding:{decodePath:()=>[{lat:-23,lng:-46}]}}
    }}};
    ctx.window=ctx;vm.runInNewContext(source("map"),ctx);
    return { elements,paths,centers,vehicles,circles,map:ctx.PetFlowDeliveryMap(),ready:()=>ready() };
}
const routeData = () => ({latitude:-23.66,longitude:-46.55,precisao_m:10,endereco_entrega:{endereco:"Rua",numero:"123"},rota:{tipoOrigem:"GPS_ENTREGADOR",polyline:"route",origem:{latitude:-23.66,longitude:-46.55},destino:{latitude:-23.67,longitude:-46.56}}});
test("mapa Google mantém posição e rota e não ressuscita após encerrar carregamento pendente", async () => {
    const h=mapHarness(),data=routeData();
    const pending=h.map.update(data);await settle();h.map.hide();h.ready();await pending;
    assert.equal(h.elements.deliveryMap.hidden,true);
    await h.map.update(data);assert.equal(h.elements.deliveryMap.hidden,false);assert.equal(h.paths.length,1);assert.equal(h.centers.at(-1).lat,-23.67);
    assert.equal(h.vehicles[0].element.children[0].src,"/images/icons/delivery-car.svg");
    assert.equal(h.vehicles[0].element.hidden,false);
    const previous=h.vehicles[0].element.style.top;
    await h.map.update({...data,latitude:-23.65});assert.equal(h.paths.length,1,"Não recria rota nem reinicia zoom a cada GPS");
    assert.notEqual(h.vehicles[0].element.style.top,previous,"O carrinho segue o GPS recebido");
    assert.equal(h.circles[1].center.lat,-23.67,"O destino continua sendo o endereço do cliente");
});
test("sem GPS aguarda o entregador e não inventa posição do veículo na loja", async () => {
    const h=mapHarness(),data={...routeData(),latitude:null,longitude:null};
    await h.map.update(data);
    assert.equal(h.elements.deliveryMap.hidden,true);
    assert.equal(h.paths.length,0); assert.equal(h.vehicles.length,0);
    assert.match(h.elements.originAddress.textContent,/Aguardando/);
    const pending=h.map.update(routeData());await settle();h.ready();await pending;
    assert.equal(h.vehicles[0].element.hidden,false);
});
test("mapa descarta rota antiga que estava fixada na loja", async () => {
    const h=mapHarness(),data=routeData();
    const pending=h.map.update({...data,rota:{...data.rota,tipoOrigem:"LOJA"}});await settle();h.ready();await pending;
    assert.equal(h.paths.at(-1).length,0,"Não desenha a rota de outra origem");
    assert.equal(h.circles[1].visible,false);
    assert.equal(h.vehicles[0].element.hidden,false,"GPS continua visível");
    await h.map.update(data);assert.equal(h.paths.at(-1).length,1);
});
