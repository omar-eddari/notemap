const map = L.map("map").setView([33.5731, -7.5898], 10);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

const markers = new Map();

let pendingLocation = null;
let loadingMarkers = false;
let editingMarkerId = null;
/* ------------------------------
   Utilities
--------------------------------*/
function fillModal(links) {
    linksContainer.innerHTML = "";

    links.forEach(link => {
        const row = document.createElement("div");

        row.className = "link-row";

        row.innerHTML = `
            <input
                type="text"
                class="link-title"
                placeholder="Title"
                value="${escapeHtml(link.title)}">

            <input
                type="url"
                class="link-url"
                placeholder="https://example.com"
                value="${link.url}">
        `;

        linksContainer.appendChild(row);
    });
}
function createId() {
    return crypto.randomUUID();
}

function saveMarkers() {
    const data = [...markers.values()].map(marker => ({
        id: marker.id,
        lat: marker.lat,
        lng: marker.lng,
        links: marker.links
    }));

    localStorage.setItem(
        "mapMarkers",
        JSON.stringify(data)
    );
}

function loadMarkers() {
    loadingMarkers = true;

    const saved = JSON.parse(
        localStorage.getItem("mapMarkers") || "[]"
    );

    saved.forEach(marker => {
        createMarker(
            {
                lat: marker.lat,
                lng: marker.lng
            },
            marker.links,
            marker.id
        );
    });

    loadingMarkers = false;
}

/* ------------------------------
   Marker Logic
--------------------------------*/

function createMarker(
    latlng,
    links,
    id = createId()
) {
    const leafletMarker =
        L.marker(latlng).addTo(map);

    const markerData = {
        id,
        lat: latlng.lat,
        lng: latlng.lng,
        links,
        leafletMarker
    };

    markers.set(id, markerData);

    updateMarkerPopup(id);

    setupMarkerHover(leafletMarker);

    if (!loadingMarkers) {
        saveMarkers();
    }
}

function setupMarkerHover(marker) {
    marker.on("mouseover", function () {
        this.openPopup();
    });

    marker.on("popupopen", function () {
        const popup =
            this.getPopup().getElement();

        popup.addEventListener(
            "mouseenter",
            () => {
                this._overPopup = true;
            }
        );

        popup.addEventListener(
            "mouseleave",
            () => {
                this._overPopup = false;
                this.closePopup();
            }
        );
    });

    marker.on("mouseout", function () {
        setTimeout(() => {
            if (!this._overPopup) {
                this.closePopup();
            }
        }, 200);
    });
}

function updateMarkerPopup(id) {
    const marker = markers.get(id);

    const linksHtml = marker.links
        .map(link => {
            return `
                <a
                    href="${link.url}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHtml(link.title)}
                </a>
            `;
        })
        .join("");

    marker.leafletMarker.bindPopup(`
        <div class="popup-links">
            <strong>Links</strong>
            <br><br>

            ${linksHtml}

            <hr>

            <div class="popup-actions">
                <button
                    class="edit-marker"
                    data-id="${id}"
                >
                    Edit
                </button>

                <button
                    class="delete-marker"
                    data-id="${id}"
                >
                    Delete
                </button>
            </div>
        </div>
    `);
}

function deleteMarker(id) {
    const marker = markers.get(id);

    if (!marker) {
        return;
    }

    if (!confirm("Delete marker?")) {
        return;
    }

    map.removeLayer(
        marker.leafletMarker
    );

    markers.delete(id);

    saveMarkers();
}

function editMarker(id) {
    const marker = markers.get(id);

    if (!marker) {
        return;
    }

    editingMarkerId = id;

    document.getElementById("modalTitle")
        .textContent = "Edit Marker";

    fillModal(marker.links);

    openModal();
}

/* ------------------------------
   Popup Events
--------------------------------*/

map.on("popupopen", event => {
    const popup =
        event.popup.getElement();

    const editBtn =
        popup.querySelector(
            ".edit-marker"
        );

    const deleteBtn =
        popup.querySelector(
            ".delete-marker"
        );

    if (editBtn) {
        editBtn.addEventListener(
            "click",
            () => {
                editMarker(
                    editBtn.dataset.id
                );
            }
        );
    }

    if (deleteBtn) {
        deleteBtn.addEventListener(
            "click",
            () => {
                deleteMarker(
                    deleteBtn.dataset.id
                );
            }
        );
    }
});

/* ------------------------------
   Modal Logic
--------------------------------*/

const modal =
    document.getElementById(
        "markerModal"
    );

const linksContainer =
    document.getElementById(
        "linksContainer"
    );

function openModal() {
    modal.style.display = "flex";
}

function closeModal() {
    modal.style.display = "none";

    resetModal();
}

function resetModal() {
    editingMarkerId = null;

    document.getElementById("modalTitle")
        .textContent = "Add Marker";

    linksContainer.innerHTML = `
        <div class="link-row">
            <input
                type="text"
                class="link-title"
                placeholder="Title">

            <input
                type="url"
                class="link-url"
                placeholder="https://example.com">
        </div>
    `;
}

document
    .getElementById("addLinkBtn")
    .addEventListener("click", () => {

        const row =
            document.createElement("div");

        row.className = "link-row";

        row.innerHTML = `
            <input
                type="text"
                class="link-title"
                placeholder="Title">

            <input
                type="url"
                class="link-url"
                placeholder="https://example.com">
        `;

        linksContainer.appendChild(row);
    });

document
    .getElementById("saveMarkerBtn")
    .addEventListener("click", () => {

        const rows =
            document.querySelectorAll(".link-row");

        const links = [...rows]
            .map(row => ({
                title: row
                    .querySelector(".link-title")
                    .value
                    .trim(),

                url: row
                    .querySelector(".link-url")
                    .value
                    .trim()
            }))
            .filter(link =>
                link.title &&
                link.url
            );

        if (!links.length) {
            alert(
                "Add at least one valid link."
            );
            return;
        }

        if (editingMarkerId) {
            const marker =
                markers.get(editingMarkerId);

            marker.links = links;

            updateMarkerPopup(
                editingMarkerId
            );

            saveMarkers();
        } else {
            createMarker(
                pendingLocation,
                links
            );
        }

        pendingLocation = null;

        closeModal();
    });

document
    .getElementById(
        "cancelMarkerBtn"
    )
    .addEventListener(
        "click",
        closeModal
    );
document.addEventListener("click", event => {
    if (
        event.target.classList.contains(
            "remove-link"
        )
    ) {
        const rows =
            document.querySelectorAll(
                ".link-row"
            );

        if (rows.length > 1) {
            event.target
                .closest(".link-row")
                .remove();
        }
    }
});
/* ------------------------------
   Map Click
--------------------------------*/

map.on("click", event => {
    editingMarkerId = null;

    pendingLocation = event.latlng;

    document.getElementById("modalTitle")
        .textContent = "Add Marker";

    resetModal();

    openModal();
});

/* ------------------------------
   Security
--------------------------------*/

function escapeHtml(text) {
    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

/* ------------------------------
   Init
--------------------------------*/

loadMarkers();
