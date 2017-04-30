var map, compare, compare2;

require([
        "esri/urlUtils",
        "esri/map",
        "esri/toolbars/draw",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/PictureFillSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/CartographicLineSymbol",
        "esri/graphic",
        "esri/Color",
        "dojo/dom",
        "dojo/on",
        "esri/dijit/Directions",
        "dojo/parser",
        "esri/InfoTemplate",
        "esri/layers/FeatureLayer",
        "esri/tasks/FindTask",
        "esri/tasks/QueryTask",
        "esri/tasks/query",
        "esri/tasks/FindParameters",
        "esri/dijit/BasemapGallery",
        "esri/arcgis/utils",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "dijit/TitlePane",
        "dojo/domReady!"
    ],
    function(
        urlUtils,
        Map,
        Draw,
        SimpleMarkerSymbol,
        SimpleLineSymbol,
        PictureFillSymbol,
        SimpleFillSymbol,
        CartographicLineSymbol,
        Graphic,
        Color,
        dom,
        on,
        Directions,
        parser,
        InfoTemplate,
        FeatureLayer,
        FindTask,
        QueryTask,
        Query,
        FindParameters,
        BasemapGallery,
        arcgisUtils
    ) {
        parser.parse();

        urlUtils.addProxyRule({
            urlPrefix: "route.arcgis.com",
            proxyUrl: "/sproxy/"
        });
        urlUtils.addProxyRule({
            urlPrefix: "traffic.arcgis.com",
            proxyUrl: "/sproxy/"
        });


        map = new Map("map", {
            basemap: "streets",
            center: [117.37, 31.01],
            zoom: 3
        });




        map.on("load", initToolbar);

        var markerSymbol = new SimpleMarkerSymbol();
        markerSymbol.setPath("M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM16.868,21.375h-1.969v-1.889h1.969V21.375zM16.772,18.094h-1.777l-0.176-8.083h2.113L16.772,18.094z");
        markerSymbol.setColor(new Color("#00FFFF"));

        // lineSymbol used for freehand polyline, polyline and line. 
        var lineSymbol = new CartographicLineSymbol(
            CartographicLineSymbol.STYLE_SOLID,
            new Color([255, 0, 0]), 10,
            CartographicLineSymbol.CAP_ROUND,
            CartographicLineSymbol.JOIN_MITER, 5
        );

        var sfs = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 0, 0]), 2),
            new Color([255, 255, 0, 0.25])
        );

        function initToolbar() {
            tb = new Draw(map);
            tb.on("draw-end", addGraphic);

            // event delegation so a click handler is not
            // needed for each individual button
            on(dom.byId("info"), "click", function(evt) {
                if (evt.target.id === "info") {
                    return;
                }
                var tool = evt.target.id.toLowerCase();
                map.disableMapNavigation();
                tb.activate(tool);
            });
        }

        function addGraphic(evt) {
            //deactivate the toolbar and clear existing graphics 
            tb.deactivate();
            map.enableMapNavigation();

            // figure out which symbol to use
            var symbol;
            if (evt.geometry.type === "point" || evt.geometry.type === "multipoint") {
                symbol = markerSymbol;
            } else if (evt.geometry.type === "line" || evt.geometry.type === "polyline") {
                symbol = lineSymbol;
            } else {
                symbol = sfs;
            }

            map.graphics.add(new Graphic(evt.geometry, symbol));
        }


        var infoTemplate = new InfoTemplate();
        infoTemplate.setTitle("地名");
        infoTemplate.setContent(
            "<b>CityNAME：</b>${CITY_NAME}<br>" +
            "<b>POP_CLASS: </b>${POP_CLASS}<br>" +
            "<b>LABEL_FLAG: </b>${LABEL_FLAG}<br>" +
            "<b>POP: </b>${POP}<br>"
        );


        var places = new FeatureLayer("http://localhost:6080/arcgis/rest/services/SampleWorldCities/MapServer/0", {
            mode: FeatureLayer.MODE_SNAPSHOT,
            infoTemplate: infoTemplate,
            outFields: [
                "CITY_NAME",
                "POP_CLASS",
                "Shape",
                "LABEL_FLAG",
                "POP"

            ]
        });

        map.addLayer(places);

        var MapServer = "http://localhost:6080/arcgis/rest/services/SampleWorldCities/MapServer/";
        //查询
        //创建属性查询对象
        var findTask = new FindTask(MapServer);
        //创建属性查询参数
        var findParams = new FindParameters();


        on(dom.byId("query"), "click", function() {
            //是否返回给我们几何信息
            findParams.returnGeometry = true;
            //对哪一个图层进行属性查询
            findParams.layerIds = [0];
            //查询的字段
            findParams.searchFields = ["LABEL_FLAG"];
            //searchText和searchFields结合使用，即查询name=New York
            findParams.searchText = "0";
            //执行查询对象
            findTask.execute(findParams, ShowFindResult);
        })

        function ShowFindResult(queryResult) {
            //创建线符号
            var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new dojo.Color([255, 0, 0]), 3);
            //创建面符号
            var fill = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, lineSymbol);
            if (queryResult.length == 0) {
                dom.byId("divShowResult").innerHTML = "";
                return;
            }
            var htmls = "";
            if (queryResult.length >= 1) {
                htmls = htmls + "<table style=\"width: 100%\">";
                htmls = htmls + "<tr><td>NAME</td></tr>";
                for (var i = 0; i < queryResult.length; i++) {
                    //获得图形graphic
                    var graphic = queryResult[i].feature;
                    //赋予相应的符号
                    graphic.setSymbol(fill);
                    //将graphic添加到地图中，从而实现高亮效果
                    map.graphics.add(graphic);
                    //获得名称（此处是和shp属性表对应的）
                    var ptName = graphic.attributes["CITY_NAME"];
                    if (i % 2 == 0)
                        htmls = htmls + "<tr>";
                    else
                        htmls = htmls + "<tr bgcolor=\"#F0F0F0\">";
                    htmls = htmls + "<td><a href=\"#\" \">" + ptName + "</a></td>";
                    htmls = htmls + "</tr>";
                }
                htmls = htmls + "</table>";
                //将属性绑定在divShowResult上面
                dom.byId("divShowResult").innerHTML = htmls;
            }
        }


        //拉框查询
        var toolBar = new Draw(map);
        on(dom.byId("queryTask"), "click", function() {
            //激活绘图工具，我要绘制一个面图形
            toolBar.activate(Draw.EXTENT);
        })
        on(toolBar, "draw-complete", function(result) {
            //获得绘图得到的面
            var geometry = result.geometry;
            //关闭绘图工具
            toolBar.deactivate();
            queryGraphic(geometry);
        });

        function queryGraphic(geometry) {

            toolBar.deactivate();
            map.graphics.clear();
            //创建查询对象，注意：服务的后面有一个编号，代表对那一个图层进行查询
            var queryTask = new QueryTask("http://localhost:6080/arcgis/rest/services/SampleWorldCities/MapServer/0");
            //创建查询参数对象
            var query = new Query();

            //空间查询的几何对象
            query.geometry = geometry;
            //服务器给我们返回的字段信息，*代表返回所有字段
            query.outFields = ["*"];
            //空间参考信息
            query.outSpatialReference = map.spatialReference;
            //查询的标准，此处代表和geometry相交的图形都要返回
            query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
            //是否返回几何信息
            query.returnGeometry = true;
            //执行空间查询
            queryTask.execute(query, showQueryResult);
        }

        function showQueryResult(queryResult) {
            //创建线符号
            var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new dojo.Color([255, 0, 0]), 3);
            //创建面符号
            var fill = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, lineSymbol);
            if (queryResult.features.length == 0) {
                dom.byId("divShowResult2").innerHTML = "NO";
                return;
            }
            var htmls = "";
            if (queryResult.features.length >= 1) {
                htmls = htmls + "<table style=\"width: 100%\">";
                htmls = htmls + "<tr><td>NAME</td></tr>";
                for (var i = 0; i < queryResult.features.length; i++) {
                    //得到graphic
                    var graphic = queryResult.features[i];
                    //给图形赋予符号
                    graphic.setSymbol(fill);
                    //添加到地图从而实现高亮效果
                    map.graphics.add(graphic);
                    //获得名称信息，此处应和shp的属性表对应
                    var ptName = graphic.attributes["CITY_NAME"];
                    if (i % 2 == 0)
                        htmls = htmls + "<tr>";
                    else
                        htmls = htmls + "<tr bgcolor=\"#F0F0F0\">";
                    htmls = htmls + "<td><a href=\"#\"\">" + ptName + "</a></td>";
                    htmls = htmls + "</tr>";
                }
                htmls = htmls + "</table>";
                //将名称信息和divShowResult绑定
                dom.byId("divShowResult2").innerHTML = htmls;
            }
        }

        //导航
        var directions = new Directions({
            map: map
        }, "dir");
        directions.startup();


        dojo.connect(map, "onMouseMove", showCoordinates);

        function showCoordinates(evt) {
            var mp = evt.mapPoint;
            dojo.byId("coord").innerHTML = "坐标：" + mp.x + "m" + "<br>" + mp.y + "m";
        }

        //底图

        var basemapGallery = new BasemapGallery({
            showArcGISBasemaps: true,
            map: map
        }, "basemapGallery");
        basemapGallery.startup();

        basemapGallery.on("error", function(msg) {
            console.log("basemap gallery error:  ", msg);
        });

        var backTop = document.getElementById('backTop');
        backTop.onclick = function() {
            window.scrollBy(0, -100);
        };


    });


var text;

var map = document.getElementById('map');
map.style.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 40 + 'px';

var contentLeft = document.getElementsByClassName('content-left')[0];
contentLeft.style.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 40 + 'px';
//_main.style.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 40 + 'px';

//侧栏拉伸动画
$(document).ready(function() {
    $('p.menu_head').click(function() {
        $(this).css('background-color', '#097979').siblings().css('background-color', '#399999');
        $(this).next('div.menu_body').slideToggle(200).siblings('div.menu_body').slideUp('slow');


        if ($(this).text() === text) {
            $(this).css('background-color', '#399999');
            // console.log(1);
        }
        text = $(this).text();

    });
});
