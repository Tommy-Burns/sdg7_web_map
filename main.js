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

// map.on("click", function(event){
//     console.log(event.latlng);
//     console.log(map.getZoom())
// })

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

  layer.bindPopup(popupContent, {
    maxWidth: 300,
  });
}

// add the data
fetch("./data/waf_data.geojson")
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    L.geoJSON(data, {
      style: geojsonStyle,
      onEachFeature: geojsonPopupDetails,
    }).addTo(map);

    console.log(data.features);

    // Add the icons
    data.features.forEach((element) => {
      cen_x = element.properties.cen_y;
      cen_y = element.properties.cen_x;

      if (cen_x && cen_y) {
        const latlng = [cen_x, cen_y];

        L.marker(latlng, {
          icon: L.icon({
            iconUrl: "./images/bulb_64.svg",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          }),
        }).addTo(map);
      }
    });
  });

// adding a legend
var legend = L.control({ position: "bottomleft" });

legend.onAdd = function (map) {
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
