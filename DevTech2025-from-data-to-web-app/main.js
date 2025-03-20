async function load() {
    const reactiveUtils = await $arcgis.import("esri/core/reactiveUtils");

    const arcgisMap = document.querySelector("arcgis-map");
    const arcgisTable = document.querySelector("arcgis-feature-table");
    const featureSheetEl = document.getElementById("feature-sheet");
    const featureDisplay = document.getElementById("feature-display");
    const chartPanel = document.getElementById("chart-panel");
    const chartElement = document.getElementById('chart');
    const tableChip = document.getElementById("table-chip");
    const chartChip = document.getElementById("chart-chip");
    const mapDiv = document.getElementById("map-div");
    const tableDiv = document.getElementById("table-div");
    const yearSlider = document.querySelector("arcgis-time-slider");

    //////////////////////////////////////////////////////
    //  Time slider setup
    //////////////////////////////////////////////////////

    yearSlider.fullTimeExtent = {
        start: new Date(1997, 0, 1),
        end: new Date(2022, 0, 1)
    };
    yearSlider.timeExtent = {
        start: new Date(1997, 0, 1),
        end: new Date(2022, 0, 1)
    };
    yearSlider.stops = {
        interval: {
            value: 5,
            unit: "years"
        }
    };

    arcgisMap.addEventListener("arcgisViewReadyChange", async () => {

        const view = arcgisMap.view;
        view.ui.container.classList.remove("calcite-mode-light");

        // set the highlight colors
        arcgisMap.highlights = [
            { name: "default", color: "#FF7500" },
            { name: "temporary", color: "#17CBE8" }
        ];

        const springWheatGroup = arcgisMap.map.layers.find((layer) => {
            return layer.title === "Wheat visualizations - 2022";
        });
        const wheatChangeLayer = springWheatGroup.layers.find((layer) => {
            return layer.title === "Change in harvested wheat from 1997 to 2022";
        });

        //////////////////////////////////////////////////////
        //  UI stuff
        //////////////////////////////////////////////////////

        tableChip.addEventListener("calciteChipSelect", (event) => handleTableChipSelect(event));
        chartChip.addEventListener("calciteChipSelect", (event) => handleChartChipSelect(event));

        function handleChartChipSelect(event) {
            const chip = event.target;

            if (!chip.selected) {
                chartPanel.style = "display: flex";
                yearSlider.timeExtent = yearSlider.fullTimeExtent;
                yearSlider.style = "display: none";
            }
            else {
                chartPanel.style = "display: none";
                handleTimeSliderVisibility();
            }
        }

        function handleTableChipSelect(event) {
            const chip = event.target;
            if (!chip.selected) {

                mapDiv.style.width = "70%";
                tableDiv.style.width = "30%";
            }
            else {
                mapDiv.style.width = "100%";
                tableDiv.style.width = "0%";
            }
        }

        reactiveUtils.watch(
            () => wheatChangeLayer.visible,
            () => {
                handleTimeSliderVisibility();
            });

        reactiveUtils.watch(
            () => wheatChangeLayer.parent.visible,
            () => {
                handleTimeSliderVisibility();
            });

        function handleTimeSliderVisibility() {
            if (wheatChangeLayer.visible && wheatChangeLayer.parent.visible) {
                yearSlider.style.display = "block";
            }
            else {
                yearSlider.style.display = "none";
            }
        }

        //////////////////////////////////////////////////////
        //  Feature table
        //////////////////////////////////////////////////////

        arcgisTable.layer = wheatChangeLayer;

        arcgisTable.actionColumnConfig = {
            label: "Zoom to feature",
            icon: "graph-time-series",  //calcite icon
            callback: ({ feature }) => handleFeatureClick(feature)
        };

        function handleFeatureClick(feature) {
            featureSheetEl.open = true;
            featureDisplay.graphic = feature;
            arcgisTable.highlightIds = [feature.attributes.FID];
            arcgisMap.goTo(feature);
        }

        //////////////////////////////////////////////////////
        //  Chart
        //////////////////////////////////////////////////////

        await wheatChangeLayer.load();
        chartElement.layer = wheatChangeLayer;
        chartElement.model = wheatChangeLayer.charts[4];
        chartElement.view = view;

        const layerView = await view.whenLayerView(wheatChangeLayer);
        chartElement.addEventListener("arcgisSelectionComplete", (event) => {
            arcgisMap.highlightSelect?.remove();
            arcgisMap.highlightSelect = layerView.highlight(event.detail.selectionData.selectionOIDs);
        });

        //////////////////////////////////////////////////////
        //  Time
        //////////////////////////////////////////////////////

        arcgisMap.timeExtent = yearSlider.timeExtent;
        const wheatChangeRenderer = wheatChangeLayer.renderer.clone();

        // Jeremy's original expression for calculating change
        // $feature.Wheat_prod_2022 - $feature.Wheat_prod_1997

        const dynamicExpression = `
              Expects($feature, "Wheat_prod_*");
              var hasEndTime = HasValue($view, ["timeProperties", "currentEnd"]);
              var hasStartTime = HasValue($view, ["timeProperties", "currentStart"]);
              if(hasEndTime && hasStartTime){
                var endYear = Year($view.timeProperties.currentEnd);
                var startYear = Year($view.timeProperties.currentStart);
    
                var endValue = $feature["Wheat_prod_" + endYear];
                var startValue = $feature["Wheat_prod_" + startYear];
                return endValue - startValue;
              }
              return null;
            `;

        wheatChangeRenderer.valueExpression = dynamicExpression;
        wheatChangeRenderer.field = null;
        const wheatChangeOutlineVariable = wheatChangeRenderer.visualVariables.find((visualVariable) => {
            return visualVariable.target === "outline" && visualVariable.type === "size";
        });

        const wheatChangeSizeVariable = wheatChangeRenderer.visualVariables.find((visualVariable) => {
            return visualVariable.type === "size" && visualVariable.target !== "outline";
        });
        wheatChangeSizeVariable.valueExpression = dynamicExpression;
        wheatChangeSizeVariable.field = null;
        wheatChangeRenderer.visualVariables = [wheatChangeSizeVariable, wheatChangeOutlineVariable];

        wheatChangeLayer.renderer = wheatChangeRenderer;
    });
}
load();
