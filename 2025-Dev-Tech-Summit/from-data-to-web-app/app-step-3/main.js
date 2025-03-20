async function load() {
    const arcgisMap = document.querySelector("arcgis-map");
    const arcgisTable = document.querySelector("arcgis-feature-table");

    arcgisMap.addEventListener("arcgisViewReadyChange", async () => {

        const springWheatGroup = arcgisMap.map.layers.find((layer) => {
            return layer.title === "Wheat visualizations - 2022";
        });

        const wheatChangeLayer = springWheatGroup.layers.find((layer) => {
            return layer.title === "Change in harvested wheat from 1997 to 2022";
        });


        // Feature table
        arcgisTable.layer = wheatChangeLayer;

        arcgisTable.actionColumnConfig = {
            label: "Zoom to feature",
            icon: "zoom-to-object",
            callback: ({ feature }) => handleFeatureClick(feature)
        };
        function handleFeatureClick(feature) {
            arcgisTable.highlightIds = [feature.attributes.FID];
            arcgisMap.goTo(feature);
        }
    });
}
load();
