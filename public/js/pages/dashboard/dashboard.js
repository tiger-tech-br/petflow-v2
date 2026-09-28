"use strict";

document.addEventListener("DOMContentLoaded", () => {
    requireDashboardAuth();
    setupDashboardDate();
    setupDashboardNavigation();
    setupDashboardNotifications();
    bindDashboardActions();
    loadDashboard();
    window.setInterval(loadDashboard, 30000);
});

const DASHBOARD_API = window.location.hostname === "localhost"
    ?"http://localhost:4500/api"
    : "/api";

let dashboardNotifications = [];
let unreadNotifications = 0;
let audioUnlocked = false;
let dashboardKnownOrderIds = new Set();
let dashboardLoadedOnce = false;

function requireDashboardAuth() {
    if (!sessionStorage.getItem("token")) {
        window.location.href = "/admin/index.html";
    }
}

function setupDashboardDate() {
    const date = document.getElementById("dashboardDate");

    if (!date) {
        return;
    }

    date.textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }).format(new Date());
}

function setupDashboardNavigation() {
    const sidebar = document.querySelector(".sidebar");
    const toggle = document.querySelector(".admin-menu-toggle");

    if (!sidebar || !toggle) {
        return;
    }

    let overlay = document.querySelector(".admin-menu-overlay");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "admin-menu-overlay";
        document.body.appendChild(overlay);
    }

    function closeSidebar() {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.body.classList.remove("admin-menu-open");
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
        const willOpen = !sidebar.classList.contains("active");
        sidebar.classList.toggle("active", willOpen);
        overlay.classList.toggle("active", willOpen);
        document.body.classList.toggle("admin-menu-open", willOpen);
        toggle.setAttribute("aria-expanded", String(willOpen));
    });

    overlay.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
}

function bindDashboardActions() {
    const refresh = document.getElementById("btnAtualizar");
    const logout = document.querySelector(".admin-profile a");

    refresh?.addEventListener("click", async () => {
        refresh.classList.add("is-loading");
        await loadDashboard();
        window.setTimeout(() => refresh.classList.remove("is-loading"), 350);
    });

    logout?.addEventListener("click", () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    });
}

function setupDashboardNotifications() {
    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");

    if (!button || !panel) {
        return;
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        audioUnlocked = true;

        const willOpen = !panel.classList.contains("active");
        panel.classList.toggle("active", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));

        if (willOpen) {
            unreadNotifications = 0;
            renderNotifications();
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".notification-menu")) {
            panel.classList.remove("active");
            button.setAttribute("aria-expanded", "false");
        }
    });

    renderNotifications();
}

async function loadDashboard() {
    try {
        const data = await apiGet("/dashboard");
        const dashboard = data?.data || data || {};

        renderSummary(dashboard.resumo || {});
        renderSchedule(dashboard.agendamentosHoje || []);
        renderSales(dashboard.ultimasVendas || []);
        renderSuppliers(dashboard.estoqueBaixo || [], dashboard.ultimasCompras || []);
        updateProfileName();
        updateNotifications(dashboard.ultimasVendas || []);
    } catch (error) {
        if (String(error.message).includes("401")) {
            window.location.href = "/admin/index.html";
            return;
        }

        renderDashboardError(error.message || "Não foi possível carregar o painel.");
    }
}

function renderSummary(summary) {
    const cards = document.querySelectorAll(".metric-card");
    const values = [
        {
            label: "Faturamento hoje",
            value: currency(summary.vendas_hoje),
            note: `${currency(summary.vendas_mes)} no mês`
        },
        {
            label: "Pedidos recebidos",
            value: number(summary.total_pedidos || summary.total_vendas || 0),
            note: `${currency(summary.contas_receber)} a receber`
        },
        {
            label: "Agenda de hoje",
            value: number(summary.agendamentos_hoje),
            note: `${number(summary.total_pets)} pets cadastrados`
        },
        {
            label: "Reposição pendente",
            value: number(summary.estoque_baixo || 0),
            note: `${currency(summary.compras_mes)} em compras no mês`
        }
    ];

    cards.forEach((card, index) => {
        const item = values[index];

        if (!item) {
            return;
        }

        const label = card.querySelector("span");
        const strong = card.querySelector("strong");
        const small = card.querySelector("small");

        if (label) label.textContent = item.label;
        if (strong) strong.textContent = item.value;
        if (small) small.textContent = item.note;
    });
}

function renderSchedule(items) {
    const list = document.querySelector(".schedule-list");

    if (!list) {
        return;
    }

    if (!items.length) {
        list.innerHTML = emptyState("Nenhum agendamento para hoje.");
        return;
    }

    list.innerHTML = items.map(item => `
        <article>
            <time>${escapeHtml(formatTime(item.hora))}</time>
            <div>
                <strong>${escapeHtml(item.servico || "Serviço agendado")} - ${escapeHtml(item.pet || "Pet")}</strong>
                <span>Cliente: ${escapeHtml(item.cliente || "Não informado")}</span>
            </div>
        </article>
    `).join("");
}

function renderSales(items) {
    const list = document.querySelector(".sales-list");

    if (!list) {
        return;
    }

    if (!items.length) {
        list.innerHTML = emptyState("Nenhum pedido registrado ainda.");
        return;
    }

    list.innerHTML = items.slice(0, 5).map(item => `
        <article>
            <span>Pedido #${escapeHtml(shortId(item.id))} - ${escapeHtml(item.cliente || "Cliente avulso")}</span>
            <strong>${currency(item.valor_total)}</strong>
        </article>
    `).join("");
}

function renderSuppliers(lowStock, purchases) {
    const list = document.querySelector(".supplier-list");

    if (!list) {
        return;
    }

    const cards = [];

    lowStock.slice(0, 2).forEach(item => {
        cards.push({
            icon: "fa-box-open",
            title: item.nome,
            text: `${number(item.quantidade)} unidade(s) em estoque.`,
            link: "/admin/pages/compras/compras.html",
            linkText: "Criar compra"
        });
    });

    purchases.slice(0, 2).forEach(item => {
        cards.push({
            icon: "fa-truck-field",
            title: item.fornecedor || "Fornecedor",
            text: `Última compra: ${currency(item.valor_total)}.`,
            link: "/admin/pages/fornecedores/fornecedores.html",
            linkText: "Ver fornecedor"
        });
    });

    if (!cards.length) {
        list.innerHTML = emptyState("Sem alertas de fornecedor ou estoque.");
        return;
    }

    list.innerHTML = cards.map(card => `
        <article>
            <i class="fa-solid ${card.icon}"></i>
            <div>
                <strong>${escapeHtml(card.title || "Item")}</strong>
                <span>${escapeHtml(card.text)}</span>
            </div>
            <a href="${card.link}">${escapeHtml(card.linkText)}</a>
        </article>
    `).join("");
}

function updateNotifications(sales) {
    const notifications = sales.slice(0, 5).map(item => ({
        id: String(item.id),
        title: `Pedido #${shortId(item.id)} recebido`,
        text: buildOrderNotificationText(item),
        details: buildOrderNotificationDetails(item)
    }));
    let hasNewNotifications = false;

    if (!dashboardLoadedOnce) {
        unreadNotifications = 0;
        dashboardKnownOrderIds = new Set(notifications.map(item => item.id));
        dashboardLoadedOnce = true;
    } else {
        const newNotifications = notifications.filter(
            item => !dashboardKnownOrderIds.has(item.id)
        );

        if (newNotifications.length) {
            hasNewNotifications = true;
            unreadNotifications += newNotifications.length;
            newNotifications.forEach(item => dashboardKnownOrderIds.add(item.id));
        }
    }

    dashboardNotifications = notifications;
    renderNotifications();

    if (hasNewNotifications && audioUnlocked) {
        playNotificationSound();
    }
}

function renderNotifications() {
    const count = document.getElementById("notificationCount");
    const status = document.getElementById("notificationStatus");
    const list = document.getElementById("notificationList");
    const button = document.getElementById("notificationButton");

    if (!count || !status || !list || !button) {
        return;
    }

    if (unreadNotifications > 0) {
        count.textContent = String(unreadNotifications);
        count.hidden = false;
        status.textContent = unreadNotifications === 1
            ? "1 novo pedido"
            : `${unreadNotifications} novos pedidos`;
    } else {
        count.textContent = "";
        count.hidden = true;
        status.textContent = "Nenhuma nova";
    }

    button.classList.toggle("has-notification", unreadNotifications > 0);

    if (!dashboardNotifications.length) {
        list.innerHTML = emptyState("Nenhuma notificação nova.");
        return;
    }

    list.innerHTML = dashboardNotifications.map(item => `
        <article>
            <i class="fa-solid fa-bag-shopping"></i>
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.text)}</span>
                ${item.details ? `<small>${escapeHtml(item.details)}</small>` : ""}
            </div>
        </article>
    `).join("");
}

function buildOrderNotificationText(item) {
    const contato =
        item.cliente_whatsapp ||
        item.cliente_telefone ||
        item.cliente_email ||
        "contato não informado";

    return `${item.cliente || "Cliente avulso"} - ${contato} - ${currency(item.valor_total)}`;
}

function buildOrderNotificationDetails(item) {
    return [
        item.cliente_endereco,
        item.cliente_numero,
        item.cliente_complemento,
        item.cliente_bairro,
        item.cliente_cidade,
        item.cliente_estado
    ].filter(Boolean).join(", ");
}

function updateProfileName() {
    const profile = document.querySelector(".admin-profile span");

    try {
        const user = JSON.parse(sessionStorage.getItem("user") || "null");
        const name = user?.nome || "Admin";

        if (profile) {
            profile.textContent = `Olá, ${name}!`;
        }
    } catch {
        if (profile) {
            profile.textContent = "Olá, Admin!";
        }
    }
}

async function apiGet(endpoint) {
    const token = sessionStorage.getItem("token");
    const response = await fetch(`${DASHBOARD_API}${endpoint}`, {
        headers: {
            ...(token ?{ Authorization: `Bearer ${token}` } : {})
        }
    });

    if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
    }

    return response.json();
}

function renderDashboardError(message) {
    document.querySelectorAll(".metric-card strong").forEach(item => {
        item.textContent = "-";
    });

    const lists = document.querySelectorAll(".schedule-list, .sales-list, .supplier-list");
    lists.forEach(list => {
        list.innerHTML = emptyState(message);
    });
}

function playNotificationSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    gain.connect(context.destination);

    [740, 980].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.12);
        oscillator.connect(gain);
        oscillator.start(context.currentTime + index * 0.12);
        oscillator.stop(context.currentTime + index * 0.12 + 0.18);
    });
}

function emptyState(message) {
    return `<div class="dashboard-empty">${escapeHtml(message)}</div>`;
}

function currency(value) {
    const numberValue = Number(value || 0);

    return numberValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function number(value) {
    return Number(value || 0).toLocaleString("pt-BR");
}

function shortId(value) {
    return String(value || "").slice(0, 6).toUpperCase() || "NOVO";
}

function formatTime(value) {
    return String(value || "").slice(0, 5) || "--:--";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
