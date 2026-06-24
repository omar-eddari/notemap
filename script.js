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
let searchMarker = null;
function goToCoordinates() {
    const lat = Number(
        document.getElementById(
            "latitudeInput"
        ).value
    );

    const lng = Number(
        document.getElementById(
            "longitudeInput"
        ).value
    );

    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {
        alert("Enter valid coordinates.");
        return;
    }

    if (
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        alert("Coordinates out of range.");
        return;
    }

    map.setView(
        [lat, lng],
        16,
        {
            animate: true
        }
    );

   const existingMarker =
    findMarkerAtLocation(
        lat,
        lng
    );

    if (existingMarker) {
        existingMarker.leafletMarker.openPopup();
        return;
    }

    pendingLocation = {
        lat,
        lng
    };

    editingMarkerId = null;

    resetModal();

    modalTitle.textContent =
        "Add Marker";

    openModal();
}
function findMarkerAtLocation(
    lat,
    lng,
    tolerance = 0.00001
) {
    return [...markers.values()].find(
        marker =>
            Math.abs(
                marker.lat - lat
            ) < tolerance &&
            Math.abs(
                marker.lng - lng
            ) < tolerance
    );
}
document
    .getElementById(
        "goToCoordinatesBtn"
    )
    .addEventListener(
        "click",
        goToCoordinates
    );
[
    "latitudeInput",
    "longitudeInput"
].forEach(id => {

    document
        .getElementById(id)
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {
                    goToCoordinates();
                }
            }
        );
});
const modal =
    document.getElementById("markerModal");

const linksContainer =
    document.getElementById("linksContainer");

const modalTitle =
    document.getElementById("modalTitle");

/* ------------------------------
   Utilities
--------------------------------*/
function getMarkersData() {
    return [...markers.values()].map(
        marker => ({
            id: marker.id,
            lat: marker.lat,
            lng: marker.lng,
            links: marker.links
        })
    );
}

function clearAllMarkers() {
    for (const marker of markers.values()) {
        map.removeLayer(
            marker.leafletMarker
        );
    }

    markers.clear();
}
function createId() {
    return crypto.randomUUID();
}

function escapeHtml(text = "") {
    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

function sanitizeUrl(url) {
    try {
        const parsed = new URL(url);

        if (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        ) {
            return parsed.href;
        }
    } catch {}

    return "#";
}

function createLinkRow(
    title = "",
    url = ""
) {
    const row =
        document.createElement("div");

    row.className = "link-row";

    row.innerHTML = `
        <input
            type="text"
            class="link-title"
            placeholder="Title"
            value="${escapeHtml(title)}">

        <input
            type="url"
            class="link-url"
            placeholder="https://example.com"
            value="${escapeHtml(url)}">

        <button
            type="button"
            class="remove-link">
            ✕
        </button>
    `;

    return row;
}

function fillModal(links = []) {
    linksContainer.innerHTML = "";

    if (!links.length) {
        linksContainer.appendChild(
            createLinkRow()
        );
        return;
    }

    links.forEach(link => {
        linksContainer.appendChild(
            createLinkRow(
                link.title,
                link.url
            )
        );
    });
}

function getModalLinks() {
    return [
        ...document.querySelectorAll(
            ".link-row"
        )
    ]
        .map(row => ({
            title: row
                .querySelector(
                    ".link-title"
                )
                .value.trim(),

            url: row
                .querySelector(
                    ".link-url"
                )
                .value.trim()
        }))
        .filter(
            link =>
                link.title &&
                link.url
        );
}

function saveMarkers() {
    const data =
        [...markers.values()].map(
            marker => ({
                id: marker.id,
                lat: marker.lat,
                lng: marker.lng,
                links: marker.links
            })
        );

    localStorage.setItem(
        "mapMarkers",
        JSON.stringify(data)
    );
}

function loadMarkers() {
    loadingMarkers = true;

    const saved = JSON.parse(
        localStorage.getItem(
            "mapMarkers"
        ) || "[]"
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
   Modal
--------------------------------*/

function openModal() {
    modal.style.display = "flex";
}

function closeModal() {
    modal.style.display = "none";

    resetModal();
}

function resetModal() {
    editingMarkerId = null;

    modalTitle.textContent =
        "Add Marker";

    fillModal();
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

    setupMarkerHover(
        leafletMarker
    );

    if (!loadingMarkers) {
        saveMarkers();
    }
}

function updateMarkerPopup(id) {
    const marker =
        markers.get(id);

    if (!marker) {
        return;
    }

    const linksHtml =
        marker.links
            .map(
                link => `
                    <a
                        href="${sanitizeUrl(link.url)}"
                        target="_blank"
                        rel="noopener noreferrer">
                        ${escapeHtml(link.title)}
                    </a>
                `
            )
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
                    data-id="${id}">
                    Edit
                </button>

                <button
                    class="delete-marker"
                    data-id="${id}">
                    Delete
                </button>

            </div>

        </div>
    `);
}

function editMarker(id) {
    const marker =
        markers.get(id);

    if (!marker) {
        return;
    }

    editingMarkerId = id;

    modalTitle.textContent =
        "Edit Marker";

    fillModal(marker.links);

    openModal();
}

function deleteMarker(id) {
    const marker =
        markers.get(id);

    if (!marker) {
        return;
    }

    if (
        !confirm(
            "Delete marker?"
        )
    ) {
        return;
    }

    map.removeLayer(
        marker.leafletMarker
    );

    markers.delete(id);

    saveMarkers();
}

function setupMarkerHover(
    marker
) {
    marker.on(
        "mouseover",
        function () {
            this.openPopup();
        }
    );

    marker.on(
        "popupopen",
        function () {
            const popup =
                this
                    .getPopup()
                    .getElement();

            popup.addEventListener(
                "mouseenter",
                () => {
                    this._overPopup =
                        true;
                }
            );

            popup.addEventListener(
                "mouseleave",
                () => {
                    this._overPopup =
                        false;

                    this.closePopup();
                }
            );
        }
    );

    marker.on(
        "mouseout",
        function () {
            setTimeout(() => {
                if (
                    !this._overPopup
                ) {
                    this.closePopup();
                }
            }, 200);
        }
    );
}

/* ------------------------------
   Popup Events
--------------------------------*/

function handlePopupClick(
    event
) {
    const button =
        event.target;

    if (
        button.classList.contains(
            "edit-marker"
        )
    ) {
        editMarker(
            button.dataset.id
        );
    }

    if (
        button.classList.contains(
            "delete-marker"
        )
    ) {
        deleteMarker(
            button.dataset.id
        );
    }
}

map.on(
    "popupopen",
    ({ popup }) => {
        popup
            .getElement()
            .addEventListener(
                "click",
                handlePopupClick
            );
    }
);

/* ------------------------------
   UI Events
--------------------------------*/

document
    .getElementById(
        "addLinkBtn"
    )
    .addEventListener(
        "click",
        () => {
            linksContainer.appendChild(
                createLinkRow()
            );
        }
    );

document
    .getElementById(
        "saveMarkerBtn"
    )
    .addEventListener(
        "click",
        () => {

            const links =
                getModalLinks();

            if (
                !links.length
            ) {
                alert(
                    "Add at least one valid link."
                );
                return;
            }

            if (
                editingMarkerId
            ) {
                const marker =
                    markers.get(
                        editingMarkerId
                    );

                if (
                    !marker
                ) {
                    closeModal();
                    return;
                }

                marker.links =
                    links;

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

            pendingLocation =
                null;

            closeModal();
        }
    );

document
    .getElementById(
        "cancelMarkerBtn"
    )
    .addEventListener(
        "click",
        closeModal
    );

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.classList.contains(
                "remove-link"
            )
        ) {
            return;
        }

        const rows =
            document.querySelectorAll(
                ".link-row"
            );

        if (
            rows.length > 1
        ) {
            event.target
                .closest(
                    ".link-row"
                )
                .remove();
        }
    }
);
function exportMarkers() {
    const data = getMarkersData();

    const blob = new Blob(
        [
            JSON.stringify(
                data,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `markers-${new Date()
            .toISOString()
            .slice(0, 10)}.json`;

    link.click();

    URL.revokeObjectURL(url);
}
async function importMarkers(
    file
) {
    try {
        const text =
            await file.text();

        const data =
            JSON.parse(text);

        if (
            !Array.isArray(data)
        ) {
            throw new Error(
                "Invalid format"
            );
        }

        clearAllMarkers();

        loadingMarkers = true;

        data.forEach(marker => {
            createMarker(
                {
                    lat: marker.lat,
                    lng: marker.lng
                },
                marker.links || [],
                marker.id
            );
        });

        loadingMarkers = false;

        saveMarkers();

        alert(
            `Imported ${data.length} markers`
        );

    } catch (error) {
        console.error(error);

        alert(
            "Invalid marker file"
        );
    }
}
const exportBtn =
    document.getElementById(
        "exportMarkersBtn"
    );

const importBtn =
    document.getElementById(
        "importMarkersBtn"
    );

const importInput =
    document.getElementById(
        "importMarkersInput"
    );

exportBtn.addEventListener(
    "click",
    exportMarkers
);

importBtn.addEventListener(
    "click",
    () => importInput.click()
);

importInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files?.[0];

        if (file) {
            importMarkers(file);
        }

        event.target.value = "";
    }
);

/* ------------------------------
   Map Click
--------------------------------*/

map.on(
    "click",
    event => {

        editingMarkerId =
            null;

        pendingLocation =
            event.latlng;

        resetModal();

        openModal();
    }
);

/* ------------------------------
   Init
--------------------------------*/

resetModal();
loadMarkers();
