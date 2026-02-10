// initialize map
var map = L.map("map", {
  center: [12.782540104722486, -4.04528596799415],
  zoom: 5,
});

// add a base layer
var baseMap = L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

function getColor(value) {
  return value > 80
    ? "#ffbf00"
    : value > 60
      ? "#cfa33a"
      : value > 40
        ? "#8c7a4a"
        : value > 20
          ? "#555555"
          : "#2b2b2b";
}
// function to create proportional bulb sizes
function getBulbSize(value) {
  const min = 14;  // smallest bulb
  const max = 48;  // biggest bulb
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const size = min + (v / 100) * (max - min);
  return Math.round(size);
}



// style for geojson layer
function geojsonStyle(feature) {
  return {
    fillColor: getColor(feature.properties.Value),
    weight: 1,
    opacity: 1,
    color: "#555",
    fillOpacity: 0.8,
  };
}

// popup for countries
function geojsonPopupDetails(feature, layer) {
  var props = feature.properties;

  var popupContent = `
    <div class="popup-container">
      <h3>${props.ADM0_NAME}</h3>
      <img src="./images/bulb_64.svg" alt="bulb image" class="popup-image" />
      <p><strong>Electricity access:</strong> ${props.Value}%</p>
    </div>
  `;

  layer.bindPopup(popupContent, { maxWidth: 300 });
}

/**
 * Hover highlight behavior:
 * - hovered country emphasized
 * - all other countries turned light gray
 */
function setHoverFocus(geojsonLayer, focusLayer) {
  geojsonLayer.eachLayer(function (l) {
    if (l === focusLayer) {
      l.setStyle({
        weight: 2,
        color: "#111",
        fillOpacity: 0.9,
      });
      if (l.bringToFront) l.bringToFront();
    } else {
      l.setStyle({
        fillColor: "#3f3f3f",
        color: "#696969",
        weight: 1,
        fillOpacity: 0.5,
      });
    }
  });
}

// Restore the original choropleth styles
function resetFocus(geojsonLayer) {
  geojsonLayer.eachLayer(function (l) {
    geojsonLayer.resetStyle(l);
  });
}

/**
 * Search control (Leaflet control with datalist autocomplete)
 */
function addSearchControl(countryNames, countryLayerByName, geojsonLayer) {
  var SearchControl = L.Control.extend({
    onAdd: function () {
      var container = L.DomUtil.create("div", "search-control leaflet-bar");
      container.innerHTML = `
        <label for="country-search">Search country</label>
        <input id="country-search" type="text" placeholder="Type a country name..." list="country-list" />
        <datalist id="country-list"></datalist>
        <div class="hint">Press Enter to zoom</div>
      `;

      // Prevent map dragging/zooming when interacting with the input
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      var datalist = container.querySelector("#country-list");
      countryNames
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .forEach((name) => {
          var opt = document.createElement("option");
          opt.value = name;
          datalist.appendChild(opt);
        });

      var input = container.querySelector("#country-search");

      function runSearch() {
        var q = (input.value || "").trim();
        if (!q) return;

        // Try exact match first (case-insensitive)
        var matchKey = countryNames.find(
          (n) => n.toLowerCase() === q.toLowerCase()
        );

        // Fallback: starts-with match
        if (!matchKey) {
          matchKey = countryNames.find(
            (n) => n.toLowerCase().startsWith(q.toLowerCase())
          );
        }

        if (!matchKey) return;

        var layer = countryLayerByName[matchKey];
        if (!layer) return;

        setHoverFocus(geojsonLayer, layer);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        layer.openPopup();
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") runSearch();
      });

      // Also zoom when user picks from the datalist
      input.addEventListener("change", runSearch);

      return container;
    },
  });

  map.addControl(new SearchControl({ position: "topleft" }));
}

// add the data
fetch("./data/waf_data.geojson")
  .then((response) => response.json())
  .then((data) => {
    var countryLayerByName = {};
    var countryNames = [];

    // create the geojson layer
    var geojsonLayer = L.geoJSON(data, {
      style: geojsonStyle,
      onEachFeature: function (feature, layer) {
        geojsonPopupDetails(feature, layer);

        // Build search index
        var name = feature.properties && feature.properties.ADM0_NAME;
        if (name) {
          countryLayerByName[name] = layer;
          countryNames.push(name);
        }

        // Hover behavior
        layer.on("mouseover", function () {
          setHoverFocus(geojsonLayer, layer);
        });

        layer.on("mouseout", function () {
          resetFocus(geojsonLayer);
        });

        // Click-to-zoom behavior
        layer.on("click", function () {
          setHoverFocus(geojsonLayer, layer);
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
          layer.openPopup();
        });
      },
    }).addTo(map);

    // Add the search control
    addSearchControl(countryNames, countryLayerByName, geojsonLayer);

    // Add the icons
    data.features.forEach((element) => {
      const cen_x = element.properties.cen_y;
      const cen_y = element.properties.cen_x;
      const value = element.properties.Value;

      if (cen_x && cen_y && value !== null && value !== undefined) {
        const latlng = [cen_x, cen_y];
        const s = getBulbSize(value);

        L.marker(latlng, {
          icon: L.icon({
            iconUrl: "./images/bulb_64.svg",
            iconSize: [s, s],
            // center the icon nicely on the point
            iconAnchor: [s / 2, s / 2],
            popupAnchor: [0, -s / 2],
          }),
        }).addTo(map);
      }
    });
  });

// adding a legend
var legend = L.control({ position: "bottomleft" });

legend.onAdd = function () {
  var div = L.DomUtil.create("div", "info legend"),
    grades = [0, 20, 40, 60, 80];
  div.innerHTML += "<strong>Electricity Access (%)</strong><br>";

  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' +
      getColor(grades[i] + 1) +
      '"></i>' +
      grades[i] +
      (grades[i + 1] ? "&ndash;" + grades[i + 1] + "<br>" : "+");
  }

  return div;
};

legend.addTo(map);

// function to toggle description
document.querySelector("#description").addEventListener("click", function () {
  document.getElementById("description").classList.toggle("collapsed");
});
