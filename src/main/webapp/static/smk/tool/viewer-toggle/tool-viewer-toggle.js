include.module( 'tool-viewer-toggle', 
		        ['tool', 'widgets', 'tool-viewer-toggle.panel-viewer-toggle-html'], 
		        function ( inc ) 
		        {
					"use strict";

					Vue.component('viewer-toggle-widget', 
					{
						extends: inc.widgets.toolButton,
					});

					Vue.component('viewer-toggle-panel', 
					{
						extends: inc.widgets.toolPanel,
						template: inc['tool-viewer-toggle.panel-viewer-toggle-html'],
						props: ['content']
					});
				    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
				    //
					function viewerToggleTool( option ) 
					{
						this.makePropWidget('icon', null);
						this.makePropPanel('content', null);

						SMK.TYPE.Tool.prototype.constructor.call(this, $.extend( 
						{
							widgetComponent: 'viewer-toggle-widget',
							panelComponent:  'viewer-toggle-panel',
							title:           '2D/3D Toggle',
							position:        'toolbar',
							content:         null
						}, option));
					}

					// merge, and probably set visibility of layers here?
				    function mergeWithExistingJSON(existingConfig, smkData)
				    {
				        for (let existingLayer in existingConfig.layers)
				        {
				            for (let sessionLayer in smkData.layers)
				            {
				                if (existingConfig.layers[existingLayer].id ==  smkData.layers[sessionLayer].id)
				                    break;
				                else if (sessionLayer == smkData.layers.length - 1) 
				                	smkData.layers.push(existingConfig.layers[existingLayer]);
				            }
				        }
				        
				        return smkData;
				    }
				    
					async function importSession(smkData)
					{
						let importDataClone = JSON.parse(JSON.stringify(smkData));
						let mapConfigJSON = JSON.parse(JSON.stringify(SMK.UTIL.copyIntoJSONObject(SMK.MAP[1])));

						smkData = mergeWithExistingJSON(mapConfigJSON, smkData);
						
				        await SMK.UTIL.rebuildSMKMAP( smkData );

				        //SMK.UTIL.checkDrawings(mapConfigJSON);

				        let zoom = Math.round(importDataClone.viewer.location.zoom != null && 
				        		              importDataClone.viewer.location.zoom >= 0 
				        		              ? importDataClone.viewer.location.zoom 
				        		              : 10); 
				        let center = importDataClone.viewer.location.center;
        
				        // leaflet specific 
				        if (SMK.MAP[1].$viewer.type == "leaflet") 
				        {
				        	if(SMK.MAP[1].viewer.location.hasOwnProperty('currentLocationAtStart'))
				        		SMK.MAP[1].viewer.location.currentLocationAtStart = false;
				        	
				            SMK.MAP[1].$viewer.currentBasemap[0]._map.setView(new L.LatLng(center[1], center[0]), zoom);
				        }   
				        else if (SMK.MAP[1].$viewer.type == "esri3d") 
				    	{
				            SMK.MAP[1].$viewer.view.camera.position = [center[0], center[1], SMK.UTIL.calculateZoomScale(zoom)];
				    	}
						else
						{
							console.log("unknown viewer declared: " + SMK.MAP[1].$viewer.type);
						}
				        
				        // Layers that are set to visible will need to be redrawn
		                SMK.MAP[1].$viewer.updateLayersVisible();
				        
				    }
    
				    SMK.TYPE.viewerToggleTool = viewerToggleTool;
				
				    $.extend( viewerToggleTool.prototype, SMK.TYPE.Tool.prototype );
				    viewerToggleTool.prototype.afterInitialize = [];
				    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
				    //
				    viewerToggleTool.prototype.afterInitialize.push(function (smk) 
				    {
				        smk.on(this.id, 
				        {
				            'activate': function () 
				            {
				            	// get current map config
				            	let smkConfig = SMK.UTIL.copyIntoJSONObject(smk) ;
				            	// set the viewer from 2d to 3d or vice versa
				            	if(smkConfig.viewer.type == "esri3d")
			            		{
				            		smkConfig.viewer.type = "leaflet";

				            		let bbox = SMK.TYPE.Esri3d.geometry.support.webMercatorUtils.webMercatorToGeographic(SMK.MAP[1].$viewer.view.extent);
				            		let center = bbox.center;
				            		let zoom = SMK.MAP[1].$viewer.view.zoom;
				            	
				            		smkConfig.viewer.location.extent = [bbox.xmax, bbox.ymax, bbox.xmin, bbox.ymin];
				            		smkConfig.viewer.location.center = [center.longitude, center.latitude];
						            smkConfig.viewer.location.zoom = Math.round(zoom) - 1;

						            if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Topo_Map")) smkConfig.viewer.baseMap = "Topographic"; 
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Street_Map")) smkConfig.viewer.baseMap = "Streets";
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Imagery")) smkConfig.viewer.baseMap = "Imagery";
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Ocean_Base")) smkConfig.viewer.baseMap = "Oceans";
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("NatGeo_World_Map")) smkConfig.viewer.baseMap = "NationalGeographic";
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Dark_Gray_Base")) smkConfig.viewer.baseMap = "DarkGray";
					                else if (SMK.MAP[1].$viewer.view.basemapView.baseLayerViews.items[0].layer.attributionDataUrl.includes("World_Light_Gray_Base")) smkConfig.viewer.baseMap = "Gray";
			            		}
				            	else
				            	{
				            		smkConfig.viewer.type = "esri3d";
				            		
				            		let bbox = SMK.MAP[1].$viewer.map.getBounds();
				            		let centroid = bbox.getCenter();
				            		let zoom = SMK.MAP[1].$viewer.map.getZoom();
				            		
				            		smkConfig.viewer.location.extent = [bbox._northEast.lng, bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat];
				            		smkConfig.viewer.location.center = [centroid.lng, centroid.lat];
						            smkConfig.viewer.location.zoom = Math.round(zoom) + 1;
						            
						            if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Topo_Map")) smkConfig.viewer.baseMap = "Topographic"; 
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Street_Map")) smkConfig.viewer.baseMap = "Streets";
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Imagery")) smkConfig.viewer.baseMap = "Imagery";
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Ocean_Base")) smkConfig.viewer.baseMap = "Oceans";
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("NatGeo_World_Map")) smkConfig.viewer.baseMap = "NationalGeographic";
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Dark_Gray_Base")) smkConfig.viewer.baseMap = "DarkGray";
					                else if ( SMK.MAP[1].$viewer.currentBasemap[0]._url.includes("World_Light_Gray_Base")) smkConfig.viewer.baseMap = "Gray";
			            		}
				            	
				            	// disable tools we don't want to show up again, leaflet autolocate, default displayed, etc.
				            	smkConfig.viewer.location.currentLocationAtStart = false;
				            	smkConfig.viewer.activeTool = null; // set to the currently active tool
				            	// start reload
				            	importSession(smkConfig);
				            }
				        });
				    });
				
				    return viewerToggleTool;
			    });
