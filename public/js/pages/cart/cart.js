"use strict";

const CART_API = "/api/public";

let cartProducts = [];
let cart = readCart();
let customer = null;
let shippingQuote = null;
let submitting = false;

document.addEventListener("DOMContentLoaded", () => {
    setupCartPage();
});

document.addEventListener("petflow:customer-logout", async () => {
    cart = {};
    shippingQuote = null;
    persistCart();
    renderCart();
    await renderCustomer();
});

async function setupCartPage() {
    try {
        const response = await fetch(`${CART_API}/produtos`);
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || "Produtos indisponíveis.");
        }

        cartProducts = Array.isArray(payload.data) ? payload.data : [];
        renderCart();
        await renderCustomer();
        setupCartEvents();
    } catch (error) {
        renderEmpty(error.message || "Não foi possível carregar sua sacola.");
    }
}

function setupCartEvents() {
    document.getElementById("calculateShipping")?.addEventListener("click", calculateShipping);
    document.addEventListener("input", event => {
        const input = event.target.closest("[data-cart-quantity]");

        if (!input) {
            return;
        }

        cart[input.dataset.cartQuantity] = Math.max(1, Number(input.value || 1));
        persistCart();
        renderCart();
    });

    document.addEventListener("click", event => {
        const remove = event.target.closest("[data-cart-remove]");

        if (!remove) {
            return;
        }

        delete cart[remove.dataset.cartRemove];
        persistCart();
        renderCart();
    });

    document.getElementById("cartForm")?.addEventListener("submit", submitOrder);
}

function renderCart() {
    const list = document.getElementById("cartItems");
    const total = document.getElementById("cartTotal");
    const items = getCartItems();

    if (!list || !total) {
        return;
    }

    if (!items.length) {
        renderEmpty("Sua sacola está vazia.");
        renderTotals();
        return;
    }

    list.innerHTML = items.map(({ product, quantity }) => {
        const id = getProductId(product);

        return `
            <article class="cart-item">
                <img src="${escapeHtml(product.foto || "/images/products/petflow-prime-racao.jpg")}" alt="${escapeHtml(product.nome)}">
                <div>
                    <strong>${escapeHtml(product.nome)}</strong>
                    <span>${currency(product.preco)}</span>
                </div>
                <input class="form-control" type="number" min="1" step="1" value="${quantity}" data-cart-quantity="${escapeHtml(id)}" aria-label="Quantidade">
                <button class="remove-button" type="button" data-cart-remove="${escapeHtml(id)}" aria-label="Remover item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </article>
        `;
    }).join("");

    renderTotals();
}

function renderTotals() {
    const subtotal = getCartTotal(getCartItems());
    document.getElementById("cartSubtotal").textContent = currency(subtotal);
    document.getElementById("cartShipping").textContent = shippingQuote ? currency(shippingQuote.valor) : "A calcular";
    document.getElementById("cartTotal").textContent = shippingQuote ? currency(subtotal + shippingQuote.valor) : `${currency(subtotal)} + frete`;
    document.querySelector("#cartForm button[type='submit']").disabled = submitting || !shippingQuote || !getCartItems().length;
}

async function calculateShipping() {
    const button = document.getElementById("calculateShipping");
    const status = document.getElementById("shippingStatus");
    shippingQuote = null;
    renderTotals();
    button.disabled = true;
    status.textContent = "Calculando o trajeto até seu endereço...";
    try {
        const response = await fetch(`${CART_API}/frete/cotar`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Não foi possível calcular o frete.");
        shippingQuote = payload.data;
        status.textContent = `${(shippingQuote.distanciaMetros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} km pelas ruas — ${currency(shippingQuote.valor)}. Cotação válida por 15 minutos.`;
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; renderTotals(); }
}

function renderEmpty(message) {
    const list = document.getElementById("cartItems");

    if (!list) {
        return;
    }

    list.innerHTML = `
        <div class="empty-cart">
            <i class="fa-solid fa-bag-shopping"></i>
            <strong>Sua sacola está vazia.</strong>
            <p>${escapeHtml(message)}</p>
            <a class="btn-secondary" href="/#products">Ver produtos</a>
        </div>
    `;
}

async function renderCustomer() {
    shippingQuote = null;
    customer = null;
    document.getElementById("calculateShipping").disabled = true;
    const container = document.getElementById("cartCustomer");
    const submit = document.querySelector("#cartForm button[type='submit']");
    const token = getToken();

    if (!container || !submit) {
        return;
    }

    if (!token) {
        submit.disabled = true;
        container.innerHTML = `
            <div class="customer-card-inner is-warning">
                <strong>Entre para finalizar</strong>
                <p>Crie sua conta ou entre para usar seu endereço salvo na PetFlow.</p>
                <a class="btn-secondary" href="/login">Entrar ou cadastrar</a>
            </div>
        `;
        return;
    }

    try {
        customer = await fetchCustomerProfile();
        const addressComplete = hasDeliveryAddress(customer);
        const contact = [customer.telefone, customer.email].filter(Boolean).join(" - ");

        submit.disabled = true;
        document.getElementById("calculateShipping").disabled = !addressComplete;
        document.getElementById("shippingStatus").textContent = addressComplete ? "Calcule o frete antes de pagar." : "Complete o endereço e o CEP em Minha conta.";
        container.innerHTML = `
            <div class="customer-card-inner ${addressComplete ? "" : "is-warning"}">
                <div>
                    <span>Cliente</span>
                    <strong>${escapeHtml(customer.nome || "Cliente PetFlow")}</strong>
                    <p>${escapeHtml(contact)}</p>
                </div>
                <div>
                    <span>Endereço de entrega</span>
                    <strong>${escapeHtml(formatAddress(customer) || "Endereço incompleto")}</strong>
                    <p>${addressComplete ? "Esse endereço será usado no pedido." : "Atualize seu endereço antes de finalizar."}</p>
                </div>
                <a class="btn-secondary" href="/conta">Editar meus dados</a>
            </div>
        `;
    } catch {
        clearCartSession();
        submit.disabled = true;
        container.innerHTML = `
            <div class="customer-card-inner is-warning">
                <strong>Sessão expirada</strong>
                <p>Entre novamente para finalizar seu pedido.</p>
                <a class="btn-secondary" href="/login">Entrar novamente</a>
            </div>
        `;
    }
}

function clearCartSession() {
    sessionStorage.removeItem("petflow_customer_token");
    sessionStorage.removeItem("petflow_customer_user");
    sessionStorage.removeItem("petflow_public_favorites");
    sessionStorage.removeItem("petflow_public_cart");
    localStorage.removeItem("petflow_customer_token");
    localStorage.removeItem("petflow_customer_user");
    localStorage.removeItem("petflow_public_favorites");
    localStorage.removeItem("petflow_public_cart");
    cart = {};
    persistCart();
}

async function submitOrder(event) {
    event.preventDefault();
    if (submitting) return;

    const status = document.getElementById("cartStatus");
    const token = getToken();
    const items = getCartItems();

    if (!items.length) {
        setStatus(status, "Adicione produtos antes de finalizar.");
        return;
    }

    if (!token) {
        setStatus(status, "Entre na sua conta para finalizar o pedido.");
        await renderCustomer();
        return;
    }

    if (!customer || !hasDeliveryAddress(customer)) {
        setStatus(status, "Atualize seu endereço antes de finalizar.");
        await renderCustomer();
        return;
    }

    if (!shippingQuote || new Date(shippingQuote.expiraEm) <= new Date()) {
        shippingQuote = null;
        renderTotals();
        setStatus(status, "Calcule novamente o frete antes de pagar.");
        return;
    }
    submitting = true;
    renderTotals();
    const data = Object.fromEntries(new FormData(event.target).entries());
    setStatus(status, "Finalizando pedido...");

    try {
        const response = await fetch(`${CART_API}/pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                formaPagamento: "PAGBANK",
                freteToken: shippingQuote.token,
                observacoes: data.observacoes,
                itens: items.map(({ product, quantity }) => ({
                    produto_id: product.id,
                    quantidade: quantity,
                    valor_unitario: Number(product.preco || 0)
                }))
            })
        });
        const payload = await response.json();

        if (!response.ok) {
            if (response.status === 409) shippingQuote = null;
            throw new Error(payload.message || "Não foi possível finalizar o pedido.");
        }

        cart = {};
        persistCart();
        renderCart();
        event.target.reset();
        setStatus(status, "Pedido recebido. Abrindo checkout seguro do PagBank...");

        await startPayment(
            payload.payment?.vendaId ||
            payload.data?.id,
            token,
            status
        );
    } catch (error) {
        setStatus(status, error.message || "Não foi possível finalizar o pedido.");
    } finally {
        submitting = false;
        renderTotals();
    }
}

async function startPayment(vendaId, token, status) {
    if (!vendaId) {
        setStatus(
            status,
            "Pedido criado, mas não foi possível abrir o checkout do PagBank."
        );
        return;
    }

    try {
        const response = await fetch(`${CART_API}/pagamentos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                vendaId
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(
                payload.message ||
                "Não foi possível abrir o checkout do PagBank."
            );
        }

        if (payload.payment?.checkoutUrl) {
            window.location.href = payload.payment.checkoutUrl;
            return;
        }

        setStatus(
            status,
            "Pedido criado. Acesse seus pedidos para acompanhar o pagamento."
        );
    } catch (error) {
        setStatus(
            status,
            error.message ||
            "Pedido criado, mas o checkout do PagBank não foi aberto."
        );
    }
}

async function fetchCustomerProfile() {
    const response = await fetch(`${CART_API}/clientes/me`, {
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    });
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Cliente não autenticado.");
    }

    sessionStorage.setItem("petflow_customer_user", JSON.stringify(payload.data));
    window.PetFlowPublicHeader?.update();
    return payload.data;
}

function getCartItems() {
    return Object.entries(cart)
        .map(([id, quantity]) => {
            const product = cartProducts.find(item => getProductId(item) === String(id));

            return product
                ? { product, quantity: Math.max(1, Number(quantity || 1)) }
                : null;
        })
        .filter(Boolean);
}

function getCartTotal(items) {
    return items.reduce((sum, item) => sum + Number(item.product.preco || 0) * item.quantity, 0);
}

function getProductId(product) {
    return String(product.id || product.sku || product.nome);
}

function readCart() {
    try {
        return JSON.parse(sessionStorage.getItem("petflow_public_cart") || "{}") || {};
    } catch {
        return {};
    }
}

function persistCart() {
    sessionStorage.setItem("petflow_public_cart", JSON.stringify(cart));
    window.PetFlowPublicHeader?.update();
}

function getToken() {
    return sessionStorage.getItem("petflow_customer_token");
}

function hasDeliveryAddress(data) {
    return Boolean(data?.endereco && data?.numero && data?.bairro && data?.cidade && data?.estado && data?.cep);
}

function formatAddress(data) {
    return [
        data.endereco,
        data.numero,
        data.complemento,
        data.bairro,
        data.cidade,
        data.estado
    ].filter(Boolean).join(", ");
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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
