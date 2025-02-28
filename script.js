// Configuration de la carte
var map = new maplibregl.Map({
  container: 'map',
  style: 'https://openmaptiles.geo.data.gouv.fr/styles/positron/style.json', // Fond de carte
  center: [-1.68, 48.12], // lat/long
  zoom: 11.5, // zoom
  pitch: 20, // Inclinaison
  bearing: 0 // Rotation
});

// Gestion du changement de style
document.getElementById('style-selector').addEventListener('change', function () {
    let newStyle = this.value;
    map.setStyle(newStyle);
    map.once('style.load', function () {
        addLayer(); // Réajout de la couche après changement de style
    });
});

// Boutons de navigation
map.addControl(new maplibregl.NavigationControl(), 'top-left');

// Ajout Échelle cartographique
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }));

// Bouton de géolocalisation
map.addControl(new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
}));

// Fonction d'ajout de couche
function addLayer() {
    map.addSource('france-vector', {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/france-vector.json'
    });
    //couche route
    map.addLayer({
        "id": "Routes",
        "type": "line",
        "source": "france-vector",
        "layout": { 'visibility': 'visible' },
        "source-layer": "transportation",
        "filter": ["all", ["in", "class", "motorway", "trunk", "primary"]],
        "paint": { "line-color": "#adb5bd", "line-width": 1 },
        "maxzoom":15.5
    });
    // Hydrologie
    map.addLayer({"id": "hydrologie",
        "type": "fill",
        "source": "france-vector",
        "layout": { 'visibility': 'visible' },
        "source-layer": "water",
        "paint": {"fill-color": "#219ebc"}
    });
  //Arrets de bus
  const ville = "Rennes";
  $.getJSON(`https://overpass-api.de/api/interpreter?data=[out:json];area[name="${ville}"]->.searchArea;(node["highway"="bus_stop"](area.searchArea););out center;`,
  function(data) {var geojsonBus = {
    type: 'FeatureCollection',
    features: data.elements.map(function(element) {
      return {type: 'Feature',
      geometry: { type: 'Point',coordinates: [element.lon, element.lat] },
      properties: {}};
    })
  };
  map.addSource('databus', {
    type: 'geojson',
    data: geojsonBus
  });
  map.addLayer({
    'id': 'Bus',
    'type': 'circle',
    'source': 'databus',
    'layout': {'visibility': 'none'},
    'paint': {'circle-color': 'red',
    'circle-radius': 4},
    });
  });
  
    // AJOUT DU CADASTRE ETALAB
    map.addSource('Cadastre', {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/cadastre.json' });

    map.addLayer({
        'id': 'Cadastre',
        'type': 'line',
        'source': 'Cadastre',
        'source-layer': 'parcelles',
        'filter': ['>', 'contenance', 1000],
        'layout': {'visibility': 'none'},
        'paint': {'line-color': '#000000'},
        'minzoom':16, 'maxzoom':19 
    });
  
    //AJOUT BATIMENT IGN
    // Ajout BDTOPO service de tuile vectorielle
    map.addSource('BDTOPO', {
      type: 'vector',
      url: 'https://data.geopf.fr/tms/1.0.0/BDTOPO/metadata.json',
      minzoom: 15,
      maxzoom: 19
    });
    map.addLayer({
      'id': 'batiments',
      'type': 'fill-extrusion',
      'source': 'BDTOPO',
      'source-layer': 'batiment',
      'layout': { 'visibility': 'none' },
      'paint': {'fill-extrusion-color': {'property': 'hauteur',
                                         'stops': [[1, '#feebe2'],
                                                   [5, '#fcc5c0'],
                                                   [10, '#fa9fb5'],
                                                   [20, '#f768a1'],
                                                   [50, '#c51b8a'],
                                                   [80, '#7a0177']]},
      'fill-extrusion-height':{'type': 'identity','property': 'hauteur'},
      'fill-extrusion-opacity': 0.90,
      'fill-extrusion-base': 0}
    });
map.setPaintProperty('communeslimites', 'line-width', ["interpolate",["exponential",1],["zoom"],16,0.3,18,1]);

//API contour comm
dataCadastre = 'https://apicarto.ign.fr/api/cadastre/commune?code_insee=35238';
jQuery.when(jQuery.getJSON(dataCadastre)).done(function(json) {
  for (i = 0; i < json.features.length; i++) {
    json.features[i].geometry = json.features[i].geometry;
  };
  map.addLayer(
    {'id': 'Contourcommune',
    'type':'line',
    'source': {'type': 'geojson','data': json},
    'paint' : {'line-color': 'black',
    'line-width':2.5},
    'layout': {'visibility': 'none'},
    });
  });
  
  //PLU zone DU
  dataPLU = 'https://apicarto.ign.fr/api/gpu/zone-urba?partition=DU_243500139';
  jQuery.when(jQuery.getJSON(dataPLU)).done(function(json) {
      // Filtrer les entités pour ne garder que celles avec typezone = 'U'
      var filteredFeatures = json.features.filter(function(feature)
      {return feature.properties.typezone === 'N';});
    // Créer un objet GeoJSON avec les entités filtrées
    var filteredGeoJSON = { type: 'FeatureCollection', features: filteredFeatures};
    map.addLayer({
      'id': 'PLU',
      'type': 'fill',
      'source': {'type': 'geojson',
      'data': filteredGeoJSON},
      'paint': {'fill-color': 'green',
      'fill-opacity': 0.5},
      'layout': { 'visibility': 'none' },
    });
  });
  
  //Parc relais 
  $.getJSON('https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/tco-parcsrelais-star-etat-tr/records?limit=20',
  function(data) {var geojsonDataPR = {
    type: 'FeatureCollection',
    features: data.results.map(function(element) {
      return {type: 'Feature',
      geometry: {type: 'Point',
      coordinates: [element.coordonnees.lon, element.coordonnees.lat]},
      properties: { name: element.nom,
      capacite: element.jrdinfosoliste}};
    })
   };
    map.addLayer({ 'id': 'Parcrelais',
      'type':'circle',
      'source': {'type': 'geojson',
      "layout": { 'visibility': 'visible' },
      'data': geojsonDataPR},
      'paint': {'circle-color': '#283618',
                'circle-radius': {property: 'capacite',
                                  type: 'exponential',
                                  stops: [[1, 5],[500, 20]]},
                'circle-opacity': 0.8}
    });
  });
  
   //station Velo STAR API (nb socle dispo + nb velo dispo)
  $.getJSON('https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/vls-stations-etat-tr/records?limit=60',
  function(data) {var geojsonDataVLS = {
    type: 'FeatureCollection',
    features: data.results.map(function(element) {
      return {type: 'Feature',
      geometry: {type: 'Point',
      coordinates: [element.coordonnees.lon, element.coordonnees.lat]},
      properties: { emplacement_dispo: element.nombreemplacementsdisponibles,
      velo_disp: element.nombrevelosdisponibles,
      nom: element.nom}};
    })
   };
    map.addLayer({ 'id': 'VLS',
      'type':'circle',
      'source': {'type': 'geojson',
      'data': geojsonDataVLS},
      'paint': {'circle-color': '#fb8500',
                'circle-radius': {property: 'velo_disp',
                                  type: 'exponential',
                                  stops: [[1, 2],[50, 15]]},
                'circle-opacity': 0.8,
                'circle-stroke-width':1.3,
                'circle-stroke-color':'#fcbf49'},
      'layout': { 'visibility': 'none' }
    });
  });
  
  //données OSM (overpass)
  $.getJSON(`https://overpass-api.de/api/interpreter?data=[out:json];area[name="${ville}"]->.searchArea;(node["amenity"="nightclub"](area.searchArea););out center;`,
  function(data) {var geojsonData = {
    type: 'FeatureCollection',
    features: data.elements.map(function(element) {
      return {type: 'Feature',
      geometry: { type: 'Point',coordinates: [element.lon, element.lat] },
      properties: {}};
    })
  };
  map.addSource('customData', {
    type: 'geojson',
    data: geojsonData
  });
  map.addLayer({
    'id': 'club',
    'type': 'circle',
    'source': 'customData',
    'layout': {'visibility': 'none'},
    'paint': {'circle-color': 'pink',
    'circle-radius': 5},
    });
  });
  
 
  //interactivité :
  
switchlayer = function (lname) {
            if (document.getElementById(lname + "CB").checked) {
                map.setLayoutProperty(lname, 'visibility', 'visible');
            } else {
                map.setLayoutProperty(lname, 'visibility', 'none');
           }
        }
  
//fin du MAP ON
}
// Ajout initial de la couche Routes après chargement
map.on('load', addLayer);

//Interactivité CLICK - pour les bus
map.on('click', function (e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['Bus'] });
  if (!features.length) {
    return;
  }
  var feature = features[0];
  var popup = new maplibregl.Popup({ offset: [0, -15], className: "MypopupBus" })
  .setLngLat(feature.geometry.coordinates)
  .setHTML('<h3>' + feature.properties.nom + '</h3><hr><h4>'
  +"Mobilier : " + feature.properties.mobilier + '</h4><p>' )
  .addTo(map);
});
map.on('mousemove', function (e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['Bus'] });
  map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
});

//pour les velos
map.on('click', function (e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['VLS'] });
  if (!features.length) {
    return;
  }
  var feature = features[0];
  var popup = new maplibregl.Popup({ offset: [0, -15], className: "MypopupVelo" })
  .setLngLat(feature.geometry.coordinates)
  .setHTML('<h3>' + feature.properties.nom + '</h3><hr><h4>'
  +"nb velo dispo : " + feature.properties.velo_disp +'<br>'+ "nb emplacement dispo : " + feature.properties.emplacement_dispo +'</h4><p>' )
  .addTo(map);
});
map.on('mousemove', function (e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['VLS'] });
  map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
});

//Interactivité HOVER
var popup = new maplibregl.Popup({
  className: "MypopupPR",
  closeButton: false,
  closeOnClick: false });
map.on('mousemove', function(e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['Parcrelais'] });
  // Change the cursor style as a UI indicator.
  map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
  if (!features.length) {
    popup.remove();
  return; }
  var feature = features[0];
  popup.setLngLat(feature.geometry.coordinates)
  .setHTML('<h3>' + feature.properties.name + ' 🚗</h3><hr><h4>'
  + feature.properties.capacite + " places disponibles"+'</h4><p>' )
  .addTo(map);
});

// Configuration onglets geographiques
document.getElementById('Gare').addEventListener('click', function (){ 
  map.flyTo({zoom: 16,
             center: [-1.672, 48.1043],
             pitch: 50});
});
document.getElementById('Rennes1').addEventListener('click', function (){ 
  map.flyTo({zoom: 16,
             center: [-1.6391490736258174,48.11807251818271],
             pitch: 50});
});
document.getElementById('Rennes2').addEventListener('click', function (){ 
  map.flyTo({zoom: 16,
             center: [-1.7012046521083755,48.11968058423725],
             pitch: 50});
});