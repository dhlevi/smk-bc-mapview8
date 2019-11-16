include.module( 'tool-theme', [ 'tool', 'widgets', 'tool-theme.panel-theme-html' ], function ( inc ) {
    "use strict";
    
    /* jshint -W040 */

    // used to store data passed in from importing
    var jsonOfSMKData = null;

    Vue.component( 'theme-widget', {
        extends: inc.widgets.toolButton,
    } );

    Vue.component( 'theme-panel', {
        extends: inc.widgets.toolPanel,
        template: inc[ 'tool-theme.panel-theme-html' ],
        props: [ 'content' ]
    } );
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    function themeTool( option ) {
        
        this.makePropWidget( 'icon', null ); //'help' )

        this.makePropPanel( 'content', null );

        SMK.TYPE.Tool.prototype.constructor.call( this, $.extend( {
            widgetComponent:'theme-widget',
            panelComponent: 'theme-panel',
            title:          'FTA Theme',
            position:       'toolbar',
            content:        null,
            config:         null
        }, option ) );
    }


    //transfer over the existing layers into the incommingJSON so that they're both available for the import process
    function mergeIncommingJSONWithExistingJSON( existingJSON, incommingJSON){

        for (let existingLayer in existingJSON.layers){
            for (let incommingLayer in incommingJSON.layers){
                if (existingJSON.layers[existingLayer].id ==  incommingJSON.layers[incommingLayer].id){
                    // if this matches this layer is already present and does not need to be added to the array
                    break;
                } else if (incommingLayer == incommingJSON.layers.length - 1) {
                    // then we've already checked our existingLayer against all the incomming layers and haven't found a match, in which case we can add our existing layer to the incomming layers
                    incommingJSON.layers.push(existingJSON.layers[existingLayer]);
                }
            }
        }
        return incommingJSON;
    }

    async function importSession( jsonOfSMKData ){

        
        let backupJSONSMKDATA = JSON.parse(JSON.stringify(jsonOfSMKData));

        // import session needs to save all of the maps current // NOT jsonOfSMKData // elsewhere so it can be retrieved after the rebuild smkData functionality
        let mapConfigJSON = SMK.UTIL.copyIntoJSONObject(SMK.MAP[1]);
        
        mapConfigJSON = JSON.parse(JSON.stringify(mapConfigJSON));
        
        // may be worth merging the layers and tools from the current data aka mapConfigJSON and the imported data aka jsonOfSMKData into one file that way the current data is always passed forwards
        
        jsonOfSMKData = mergeIncommingJSONWithExistingJSON(mapConfigJSON, jsonOfSMKData);

        // then call the rebuild SMKMAP function which will turn on all the geojson from the import
        // normally this function is called with current smk data
        await SMK.UTIL.rebuildSMKMAP( jsonOfSMKData );

         // then once the map is rebuilt with the import drawings added to it, we want to retrieve out stored geojson and add that to the map also:
        SMK.UTIL.checkDrawings(mapConfigJSON);

        let zoom = Math.round(backupJSONSMKDATA.viewer.location.zoom != null && 
        		              backupJSONSMKDATA.viewer.location.zoom >= 0 
        		              ? backupJSONSMKDATA.viewer.location.zoom 
        		              : 10); 
        let center = backupJSONSMKDATA.viewer.location.center;
        
        // leaflet specific 
        if (SMK.MAP[1].$viewer.type == "leaflet") 
        {
        	if(SMK.MAP[1].$viewer.location.hasOwnProperty('currentLocationAtStart'))
        		SMK.MAP[1].$viewer.location.currentLocationAtStart = false;
        	
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
    }


    SMK.TYPE.themeTool = themeTool;

    $.extend( themeTool.prototype, SMK.TYPE.Tool.prototype );
    themeTool.prototype.afterInitialize = [];
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    themeTool.prototype.afterInitialize.push( function ( smk ) 
    {
    	//SMK.MAP[1].$tool[].
    	var self = this;
        smk.on( this.id, 
        {
            'activate': function () 
            {
            	
            	$.getJSON( self.config, function(data) 
            	{
        		  console.log( "loading theme success" );
        		  jsonOfSMKData = data;

                  if ( jsonOfSMKData != null) 
                  {
                	  
                	  if (SMK.MAP[1].$viewer.type == "leaflet") 
    		          {
            			  let bbox = SMK.MAP[1].$viewer.map.getBounds();
    	            	  let centroid = bbox.getCenter();
    	            	  let zoom = SMK.MAP[1].$viewer.map.getZoom();
    	            		
    	            	  jsonOfSMKData.viewer.location.extent = [bbox._northEast.lng, bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat];
    	            	  jsonOfSMKData.viewer.location.center = [centroid.lng, centroid.lat];
    	            	  jsonOfSMKData.viewer.location.zoom = Math.round(zoom);
    		          }   
    		          else if (SMK.MAP[1].$viewer.type == "esri3d") 
    		    	  {
    		        	  let bbox = SMK.TYPE.Esri3d.geometry.support.webMercatorUtils.webMercatorToGeographic(SMK.MAP[1].$viewer.view.extent);
                		  let center = bbox.center;
                		  let zoom = SMK.MAP[1].$viewer.view.zoom;
                	
                		  jsonOfSMKData.viewer.location.extent = [bbox.xmax, bbox.ymax, bbox.xmin, bbox.ymin];
                		  jsonOfSMKData.viewer.location.center = [center.longitude, center.latitude];
                 		  jsonOfSMKData.viewer.location.zoom = Math.round(zoom) - 1;
    		    	  }
                	  
                	  jsonOfSMKData.viewer.location.currentLocationAtStart = false;
                	  jsonOfSMKData.viewer.activeTool = null; // set to the currently active tool
		            	
                      importSession( jsonOfSMKData );
                  }
        		})
    		    .done(function() {
    		      console.log( "loading theme finished" );
    		    })
    		    .fail(function() {
    		      console.log( "loading theme error" );
    		    })
    		    .always(function() {
    		     console.log( "loading theme complete" );
    		    });
            }
        } );

    } );

    return themeTool;
} );
