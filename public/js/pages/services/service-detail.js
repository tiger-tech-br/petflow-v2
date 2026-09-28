"use strict";

const SERVICE_API = window.location.hostname === "localhost"
    ? "http://localhost:4500/api/public"
    : "/api/public";

const SERVICE_IMAGES = {
    banho: "/images/services/banho-tosa.jpg",
    "consulta-veterinaria": "/images/services/veterinario.jpg",
    hotelzinho: "/images/services/hotelzinho.jpg",
    "tosa-completa": "/images/services/tosa.jpg",
    "tosa-higienica": "/images/services/tosa-higienica.jpg",
    vacinacao: "/images/services/vacinacao.jpg",
    delivery: "/images/services/delivery.jpg"
};

let selectedService = null;

document.addEventListener("DOMContentLoaded", () => {
    setupServicePage();
});

async function setupServicePage() {
    const status = document.getElementById("serviceStatus");

    try {
        selectedService = await loadServiceFromSlug();
        renderService(selectedService);
        setupMinimumDate();
        setupPetSelector();
        setupServiceForm();
        await loadCustomerPets();
    } catch (error) {
        setStatus(status, error.message || "Não foi possível carregar o serviço.");
    }
}

async function loadServiceFromSlug() {
    const slug = getCurrentSlug();
    const response = await fetch(`${SERVICE_API}/servicos`);
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Serviços indisponíveis.");
    }

    const services = Array.isArray(payload.data) ? payload.data : [];
    const service = services.find(item => serviceSlug(item.nome) === slug);

    if (!service) {
        throw new Error("Serviço não encontrado.");
    }

    return service;
}

function renderService(service) {
    const slug = serviceSlug(service.nome);

    document.title = `PetFlow | ${service.nome}`;
    setText("serviceTitle", service.nome);
    setText("serviceDescription", service.descricao || "Atendimento profissional para cuidar do bem-estar do seu pet.");
    setText("servicePrice", currency(service.preco));

    const serviceId = document.getElementById("serviceId");
    const image = document.getElementById("serviceImage");

    if (serviceId) serviceId.value = service.id;

    if (image) {
        image.src = SERVICE_IMAGES[slug] || "/images/services/banho-tosa.jpg";
        image.alt = service.nome;
    }
}

async function loadCustomerPets() {
    const form = document.getElementById("serviceRequestForm");
    const loginLink = document.getElementById("serviceLoginLink");
    const token = getToken();

    if (!token) {
        setText("serviceLoginNotice", "Entre ou crie seu cadastro para solicitar este serviço.");
        loginLink?.classList.remove("is-hidden");
        form?.querySelectorAll("input, select, textarea, button").forEach(field => {
            field.disabled = true;
        });
        return;
    }

    loginLink?.classList.add("is-hidden");
    form?.querySelectorAll("input, select, textarea, button").forEach(field => {
        field.disabled = false;
    });

    try {
        const payload = await request("/clientes/pets", "GET");
        renderPetOptions(Array.isArray(payload.data) ? payload.data : []);
        setText("serviceLoginNotice", "Escolha seu pet e envie a solicitação. Se ele ainda não estiver cadastrado, cadastre abaixo.");
    } catch (error) {
        setText("serviceLoginNotice", error.message || "Não foi possível carregar seus pets.");
    }
}

function renderPetOptions(pets) {
    const select = document.getElementById("petId");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Cadastrar novo pet</option>${pets.map(pet => `
        <option value="${escapeHtml(pet.id)}">${escapeHtml(pet.nome)}${pet.especie ? ` - ${escapeHtml(pet.especie)}` : ""}</option>
    `).join("")}`;

    toggleNewPetFields();
}

function setupPetSelector() {
    document.getElementById("petId")?.addEventListener("change", toggleNewPetFields);
}

function toggleNewPetFields() {
    const select = document.getElementById("petId");
    const fields = document.getElementById("newPetFields");

    fields?.classList.toggle("is-hidden", Boolean(select?.value));
}

function setupMinimumDate() {
    const input = document.getElementById("serviceDate");

    if (!input) {
        return;
    }

    input.min = new Date().toISOString().slice(0, 10);
}

function setupServiceForm() {
    const form = document.getElementById("serviceRequestForm");

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const status = document.getElementById("serviceStatus");
        const button = form.querySelector("button[type='submit']");

        setStatus(status, "Enviando solicitação...");
        if (button) button.disabled = true;

        try {
            const data = Object.fromEntries(new FormData(form).entries());
            const petId = data.petId || await createPetFromForm(data);

            await request("/agendamentos", "POST", {
                servicoId: data.servicoId,
                petId,
                data: data.data,
                hora: data.hora,
                observacoes: data.observacoes
            });

            form.reset();
            await loadCustomerPets();
            setStatus(status, "Solicitação enviada. A equipe PetFlow confirmará o horário.");
        } catch (error) {
            setStatus(status, error.message || "Não foi possível enviar a solicitação.");
        } finally {
            if (button) button.disabled = false;
        }
    });
}

async function createPetFromForm(data) {
    if (!data.petNome || !data.petEspecie) {
        throw new Error("Informe o nome e a espécie do pet.");
    }

    const payload = await request("/clientes/pets", "POST", {
        nome: data.petNome,
        especie: data.petEspecie,
        raca: data.petRaca,
        porte: data.petPorte
    });

    return payload.data.id;
}

async function request(path, method, body) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    const token = getToken();

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${SERVICE_API}${path}`, options);
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Não foi possível concluir a solicitação.");
    }

    return payload;
}

function getCurrentSlug() {
    return window.location.pathname.split("/").filter(Boolean).pop() || "";
}

function serviceSlug(value) {
    return normalize(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getToken() {
    return sessionStorage.getItem("petflow_customer_token");
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function setStatus(element, message) {
    if (element) {
        element.textContent = message || "";
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
