"use strict";

const PETS_API = window.location.hostname === "localhost"
    ? "http://localhost:4500/api/public"
    : "/api/public";

let publicPets = [];

document.addEventListener("DOMContentLoaded", () => {
    setupPublicPets();
});

document.addEventListener("petflow:customer-logout", () => {
    window.location.href = "/";
});

async function setupPublicPets() {
    if (!getToken()) {
        window.location.href = "/login";
        return;
    }

    document.getElementById("publicPetForm")?.addEventListener("submit", savePet);
    document.getElementById("clearPetForm")?.addEventListener("click", clearForm);

    document.addEventListener("click", event => {
        const edit = event.target.closest("[data-edit-pet]");
        const remove = event.target.closest("[data-remove-pet]");

        if (edit) {
            fillForm(publicPets.find(pet => pet.id === edit.dataset.editPet));
        }

        if (remove) {
            removePet(remove.dataset.removePet);
        }
    });

    await loadPets();
}

async function loadPets() {
    const status = document.getElementById("petStatus");

    try {
        const payload = await request("/clientes/pets", "GET");
        publicPets = Array.isArray(payload.data) ? payload.data : [];
        renderPets();
        setStatus(status, "");
    } catch (error) {
        setStatus(status, error.message || "Não foi possível carregar seus pets.");
    }
}

async function savePet(event) {
    event.preventDefault();

    const form = event.target;
    const status = document.getElementById("petStatus");
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.id;

    setStatus(status, "Salvando...");

    try {
        await request(id ? `/clientes/pets/${id}` : "/clientes/pets", id ? "PUT" : "POST", data);
        clearForm();
        await loadPets();
        setStatus(status, id ? "Pet atualizado com sucesso." : "Pet cadastrado com sucesso.");
    } catch (error) {
        setStatus(status, error.message || "Não foi possível salvar o pet.");
    }
}

async function removePet(id) {
    const status = document.getElementById("petStatus");

    if (!window.confirm("Remover este pet da sua conta?")) {
        return;
    }

    setStatus(status, "Removendo...");

    try {
        await request(`/clientes/pets/${id}`, "DELETE");
        await loadPets();
        setStatus(status, "Pet removido com sucesso.");
    } catch (error) {
        setStatus(status, error.message || "Não foi possível remover o pet.");
    }
}

function renderPets() {
    const list = document.getElementById("publicPetsList");

    if (!list) {
        return;
    }

    if (!publicPets.length) {
        list.innerHTML = `
            <div class="orders-empty">
                <i class="fa-regular fa-folder-open"></i>
                <strong>Nenhum pet cadastrado.</strong>
                <span>Cadastre seu primeiro pet para solicitar serviços com mais facilidade.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = publicPets.map(pet => `
        <article class="public-pet-card">
            <div>
                <span>${escapeHtml(pet.especie || "Pet")}</span>
                <strong>${escapeHtml(pet.nome)}</strong>
                <p>${escapeHtml(formatPetDetails(pet))}</p>
            </div>
            <div class="pet-card-actions">
                <button class="btn btn-secondary btn-edit-pet" type="button" data-edit-pet="${escapeHtml(pet.id)}">
                    <i class="fa-solid fa-pen"></i>
                    Editar
                </button>
                <button class="btn btn-secondary btn-remove-pet" type="button" data-remove-pet="${escapeHtml(pet.id)}">
                    <i class="fa-solid fa-trash"></i>
                    Remover
                </button>
            </div>
        </article>
    `).join("");
}

function fillForm(pet) {
    if (!pet) {
        return;
    }

    const form = document.getElementById("publicPetForm");

    form.id.value = pet.id || "";
    form.nome.value = pet.nome || "";
    form.especie.value = pet.especie || "";
    form.raca.value = pet.raca || "";
    form.sexo.value = pet.sexo || "";
    form.porte.value = pet.porte || "";
    form.peso.value = pet.peso || "";
    form.observacoes.value = pet.observacoes || "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearForm() {
    document.getElementById("publicPetForm")?.reset();
    const id = document.getElementById("petId");

    if (id) {
        id.value = "";
    }
}

async function request(path, method, body) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        }
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${PETS_API}${path}`, options);
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Não foi possível concluir a solicitação.");
    }

    return payload;
}

function formatPetDetails(pet) {
    return [
        pet.raca,
        formatEnum(pet.sexo),
        formatEnum(pet.porte),
        pet.peso ? `${Number(pet.peso).toLocaleString("pt-BR")} kg` : "",
        pet.observacoes
    ].filter(Boolean).join(" - ") || "Sem detalhes adicionais.";
}

function formatEnum(value) {
    const labels = {
        MACHO: "Macho",
        FEMEA: "Fêmea",
        PEQUENO: "Pequeno",
        MEDIO: "Médio",
        GRANDE: "Grande"
    };

    return labels[value] || "";
}

function getToken() {
    return sessionStorage.getItem("petflow_customer_token");
}

function setStatus(element, message) {
    if (element) {
        element.textContent = message || "";
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
