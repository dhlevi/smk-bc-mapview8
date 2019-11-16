include.module( 'viewer-leaflet', [ 'viewer', 'leaflet', 'layer-leaflet', 'feature-list-leaflet', 'turf' ], function () {
    "use strict";

    function ViewerLeaflet() {
        SMK.TYPE.Viewer.prototype.constructor.apply( this, arguments )
    }

    if ( !SMK.TYPE.Viewer ) SMK.TYPE.Viewer = {}
    SMK.TYPE.Viewer.leaflet = ViewerLeaflet

    $.extend( ViewerLeaflet.prototype, SMK.TYPE.Viewer.prototype )
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.initialize = function ( smk ) {
        var self = this

        SMK.TYPE.Viewer.prototype.initialize.apply( this, arguments )

        this.deadViewerLayer = {}

        var el = smk.addToContainer( '<div class="smk-viewer">' )

        self.map = L.map( el, {
            dragging:           false,
            zoomControl:        false,
            boxZoom:            false,
            doubleClickZoom:    false,
            zoomSnap:           0,
        } )

        self.map.scrollWheelZoom.disable()

        if ( smk.viewer.location.extent ) {
            var bx = smk.viewer.location.extent
            self.map.fitBounds( [ [ bx[ 1 ], bx[ 0 ] ], [ bx[ 3 ], bx[ 2 ] ] ] )
        }

        if ( smk.viewer.location.zoom ) {
            self.map.setZoom( smk.viewer.location.zoom, { animate: false } )
        }

        if ( smk.viewer.location.center ) {
            self.map.panTo( [ smk.viewer.location.center[ 1 ], smk.viewer.location.center[ 0 ] ], { animate: false } )
        }

        if ( smk.viewer.baseMap ) {
            self.setBasemap( smk.viewer.baseMap )
        }
        
        if(smk.viewer.location.currentLocationAtStart)
    	{
        	var zoom = smk.viewer.location.currentLocationAtStartZoom;
        	if(zoom == null) zoom = 10;
        	
        	self.map.locate({setView: true, maxZoom: zoom});
    	}

        function changedView( ev) {
            return function () {
                self.changedView( ev )
            }
        }

        self.map.on( 'zoomstart', changedView( { operation: 'zoom', after: 'start' } ) )
        self.map.on( 'movestart', changedView( { operation: 'move', after: 'start' } ) )
        self.map.on( 'zoomend', changedView( { operation: 'zoom', after: 'end' } ) )
        self.map.on( 'moveend', changedView( { operation: 'move', after: 'end' } ) )
        changedView()()

        self.finishedLoading( function () {
            self.map.eachLayer( function ( ly ) {
                if ( !ly._smk_id ) return

                if ( self.deadViewerLayer[ ly._smk_id ] ) {
                    self.map.removeLayer( ly )
                    delete self.visibleLayer[ ly._smk_id ]
                    // console.log( 'remove', ly._smk_id )
                }
            } )

            Object.keys( self.deadViewerLayer ).forEach( function ( id ) {
                delete self.deadViewerLayer[ id ]
                delete self.visibleLayer[ id ]
                // console.log( 'dead', id )
            } )
        } )

        self.map.on( 'click', function ( ev ) {
            self.pickedLocation( {
                map:    { latitude: ev.latlng.lat, longitude: ev.latlng.lng },
                screen: ev.containerPoint,
            } )
        } )

        self.map.on( 'mousemove', function ( ev ) {
            self.changedLocation( {
                map:    { latitude: ev.latlng.lat, longitude: ev.latlng.lng },
                screen: ev.containerPoint,
            } )
        } )

        self.getVar = function () { return smk.getVar.apply( smk, arguments ) }
        
        // handlers for WFS vectors
        
        self.map.on('zoomend', function() 
    	{
    		Object.keys( SMK.MAP[1].$viewer.visibleLayer ).forEach( function ( lid ) 
			{
				SMK.MAP[1].layers.forEach( function ( ly )
				{
					var scale = SMK.MAP[1].$viewer.getScale();
					if(ly.isWfs && ly.id == lid && (scale <= ly.minScale || ly.minScale == null) && (scale >= ly.maxScale || ly.maxScale == null)) 
					{
						var layer = SMK.MAP[1].$viewer.visibleLayer[lid];
						
    					// get bounds
    					var bbox = SMK.MAP[1].$viewer.map.getBounds();
    					var poly = turf.bboxPolygon([bbox._northEast.lng, bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat]);
    					poly = turf.buffer(poly, 20, {units: 'meters'});
	            		// buffer it
    					
    					// add to url - poly.geometry.coordinates[""0""][1][""0""]
    					var boundedUrl = ly.dataUrl + "&filter=%3CFilter%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3CIntersects%3E%3CPropertyName%3E%3C%2FPropertyName%3E%3Cgml%3APolygon%20srsName%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%2Fsrs%2Fepsg.xml%234326%22%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3Cgml%3AouterBoundaryIs%3E%3Cgml%3ALinearRing%3E%3Cgml%3Acoordinates%20decimal%3D%22.%22%20cs%3D%22%2C%22%20ts%3D%22%20%22%3E";
    					// loop geom
    					
    					var coords = poly.geometry.coordinates[0];
    					
    					var i;
    					for (i = 0; i < coords.length; i++) 
    					{
    						boundedUrl += coords[i][0] + "%2C";
    						boundedUrl += coords[i][1] + "%20";
    					}
						
    					boundedUrl += "%3C%2Fgml%3Acoordinates%3E%3C%2Fgml%3ALinearRing%3E%3C%2Fgml%3AouterBoundaryIs%3E%3C%2Fgml%3APolygon%3E%3C%2FIntersects%3E%3C%2FFilter%3E";
	            		
    					var url = SMK.MAP[1].$viewer.resolveAttachmentUrl( boundedUrl, ly.id, 'json' )

    			        return SMK.UTIL.makePromise( function ( res, rej ) {
			                $.get( url, null, null, 'json' ).then( res, function ( xhr, status, err ) { 
			                    rej( 'Failed requesting ' + url + ': ' + xhr.status + ',' + err ) 
			                } )
			            } )
			            .then( function ( data ) {
			                console.log( 'loaded', url )
			                // if it's a regular layer, just add the data
			                if(!layer.hasOwnProperty("_topClusterLevel"))
		            		{
			                	layer.clearLayers();
			                	layer.addData( data )
		            		}
			                else // if it's a clustered layer or a heatmap, create a new layer and add the data
		                	{
			                	SMK.MAP[1].$viewer.map.removeLayer( layer );
			                	layer = SMK.TYPE.Layer[ 'vector' ][ 'leaflet' ].createClusterLayer(data, ly);
			                	SMK.MAP[1].$viewer.map.addLayer( layer );
			                	SMK.MAP[1].$viewer.visibleLayer[ ly.id ] = layer;
		                	}
			                return layer
			            } )
			            .then( function ( layer ) {
			                if ( !ly.useHeatmap ) return layer
		
							var points = [];
							var intensity = 100;
		
							layer.eachLayer( function ( ly ) {
								var centroid = turf.centroid( ly.feature.geometry )
								points.push( [ centroid.geometry.coordinates[ 1 ], centroid.geometry.coordinates[ 0 ], intensity ] )
							});
		
							return L.heatLayer( points, { radius: 25 } )
			            } )
    				}
				});
			});
		})

		self.map.on('dragend', function() 
		{
			Object.keys( SMK.MAP[1].$viewer.visibleLayer ).forEach( function ( lid ) 
			{
				SMK.MAP[1].layers.forEach( function ( ly )
				{
					var scale = SMK.MAP[1].$viewer.getScale();
					if(ly.isWfs && ly.id == lid && (scale <= ly.minScale || ly.minScale == null) && (scale >= ly.maxScale || ly.maxScale == null))
					{
						var layer = SMK.MAP[1].$viewer.visibleLayer[lid];
						
    					// get bounds
    					var bbox = SMK.MAP[1].$viewer.map.getBounds();
    					var poly = turf.bboxPolygon([bbox._northEast.lng, bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat]);
    					poly = turf.buffer(poly, 20, {units: 'meters'});
	            		// buffer it
    					
    					// add to url - poly.geometry.coordinates[""0""][1][""0""]
    					var boundedUrl = ly.dataUrl + "&filter=%3CFilter%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3CIntersects%3E%3CPropertyName%3E%3C%2FPropertyName%3E%3Cgml%3APolygon%20srsName%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%2Fsrs%2Fepsg.xml%234326%22%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3Cgml%3AouterBoundaryIs%3E%3Cgml%3ALinearRing%3E%3Cgml%3Acoordinates%20decimal%3D%22.%22%20cs%3D%22%2C%22%20ts%3D%22%20%22%3E";
    					// loop geom
    					
    					var coords = poly.geometry.coordinates[0];
    					
    					var i;
    					for (i = 0; i < coords.length; i++) 
    					{
    						boundedUrl += coords[i][0] + "%2C";
    						boundedUrl += coords[i][1] + "%20";
    					}
						
    					boundedUrl += "%3C%2Fgml%3Acoordinates%3E%3C%2Fgml%3ALinearRing%3E%3C%2Fgml%3AouterBoundaryIs%3E%3C%2Fgml%3APolygon%3E%3C%2FIntersects%3E%3C%2FFilter%3E";
	            		
    					var url = SMK.MAP[1].$viewer.resolveAttachmentUrl( boundedUrl, ly.id, 'json' )

    			        return SMK.UTIL.makePromise( function ( res, rej ) {
			                $.get( url, null, null, 'json' ).then( res, function ( xhr, status, err ) { 
			                    rej( 'Failed requesting ' + url + ': ' + xhr.status + ',' + err ) 
			                } )
			            } )
			            .then( function ( data ) {
			                console.log( 'loaded', url )
			                // if it's a regular layer, just add the data
			                if(!layer.hasOwnProperty("_topClusterLevel"))
		            		{
			                	layer.clearLayers();
			                	layer.addData( data )
		            		}
			                else // if it's a clustered layer or a heatmap, create a new layer and add the data
		                	{
			                	SMK.MAP[1].$viewer.map.removeLayer( layer );
			                	layer = SMK.TYPE.Layer[ 'vector' ][ 'leaflet' ].createClusterLayer(data, ly);
			                	SMK.MAP[1].$viewer.map.addLayer( layer );
			                	SMK.MAP[1].$viewer.visibleLayer[ ly.id ] = layer;
		                	}
			                return layer
			            } )
			            .then( function ( layer ) {
			                if ( !ly.useHeatmap ) return layer
		
							var points = [];
							var intensity = 100;
		
							layer.eachLayer( function ( ly ) {
								var centroid = turf.centroid( ly.feature.geometry )
								points.push( [ centroid.geometry.coordinates[ 1 ], centroid.geometry.coordinates[ 0 ], intensity ] )
							});
		
							return L.heatLayer( points, { radius: 25 } )
			            } )
    				}
				});
			});
		})
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.getScale = function () {
        var size = this.map.getSize()

        var vertical = size.y / 2,
            mapDist = this.map.distance(
                this.map.containerPointToLatLng( [ 0,   vertical ] ),
                this.map.containerPointToLatLng( [ 100, vertical ] )
            )

        return mapDist / this.screenpixelsToMeters
    }

    ViewerLeaflet.prototype.getView = function () {
        var self = this

        var b = this.map.getBounds()
        var size = this.map.getSize()
        var c = this.map.getCenter()

        var vertical = size.y / 2,
            mapDist = this.map.distance(
                this.map.containerPointToLatLng( [ 0,   vertical ] ),
                this.map.containerPointToLatLng( [ 100, vertical ] )
            )

        return {
            center: { latitude: c.lat, longitude: c.lng },
            zoom: this.map.getZoom(),
            extent: [ b.getWest(), b.getSouth(), b.getEast(), b.getNorth() ],
            scale: mapDist / this.screenpixelsToMeters,
            metersPerPixel: mapDist / 100,
            screen: {
                width:  size.x,
                height: size.y
            },
            // metersPerPixelAtY: function ( vertical ) {
            //     return self.map.distance( self.map.containerPointToLatLng( [ 0, vertical ] ), self.map.containerPointToLatLng( [ 100, vertical ] ) ) / 100
            // }
        }
    }

    ViewerLeaflet.prototype.screenToMap = function ( screen ) {
        var ll
        if ( Array.isArray( screen ) )
            ll = this.map.containerPointToLatLng( screen )
        else
            ll = this.map.containerPointToLatLng( [ screen.x, screen.y ] )

        return [ ll.lng, ll.lat ]
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.basemap.ShadedRelief.labels = [ 'ShadedReliefLabels' ]
    ViewerLeaflet.prototype.basemap.Gray.labels = [ 'GrayLabels' ]
    ViewerLeaflet.prototype.basemap.DarkGray.labels = [ 'DarkGrayLabels' ]
    ViewerLeaflet.prototype.basemap.Imagery.labels = [ 'ImageryTransportation', 'ImageryLabels' ]
    ViewerLeaflet.prototype.basemap.Oceans.labels = [ 'OceansLabels' ]
    // ViewerLeaflet.prototype.basemap.Terrain.labels = [ 'TerrainLabels' ]

    ViewerLeaflet.prototype.setBasemap = function ( basemapId ) {
        var self = this

        if( this.currentBasemap ) {
            this.currentBasemap.forEach( function ( ly ) {
                self.map.removeLayer( ly );
            } )
        }

        this.currentBasemap = this.createBasemapLayer( basemapId );

        this.map.addLayer( this.currentBasemap[ 0 ] );
        this.currentBasemap[ 0 ].bringToBack();

        for ( var i = 1; i < this.currentBasemap.length; i += 1 )
            this.map.addLayer( this.currentBasemap[ i ] );

        this.changedBaseMap( { baseMap: basemapId } )
    }

    ViewerLeaflet.prototype.createBasemapLayer = function ( basemapId ) {
        var lys = []
        lys.push( L.esri.basemapLayer( basemapId, { detectRetina: true } ) )

        if ( this.basemap[ basemapId ].labels )
            this.basemap[ basemapId ].labels.forEach( function ( id ) {
                lys.push( L.esri.basemapLayer( id, { detectRetina: true } ) )
            } )

        return lys
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.addViewerLayer = function ( viewerLayer ) {
        this.map.addLayer( viewerLayer );

        // if wfs, refresh data
        // needs to be merged with identical code from zoomend and moveend
		SMK.MAP[1].layers.forEach( function ( ly )
		{
			var scale = SMK.MAP[1].$viewer.getScale();
			if(ly.isVisible && ly.isWfs && ly.id == viewerLayer._smk_id && (scale <= ly.minScale || ly.minScale == null) && (scale >= ly.maxScale || ly.maxScale == null))
			{
				// get bounds
				var bbox = SMK.MAP[1].$viewer.map.getBounds();
				var poly = turf.bboxPolygon([bbox._northEast.lng, bbox._northEast.lat, bbox._southWest.lng, bbox._southWest.lat]);
				poly = turf.buffer(poly, 20, {units: 'meters'});
        		// buffer it
				
				// add to url - poly.geometry.coordinates[""0""][1][""0""]
				var boundedUrl = ly.dataUrl + "&filter=%3CFilter%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3CIntersects%3E%3CPropertyName%3E%3C%2FPropertyName%3E%3Cgml%3APolygon%20srsName%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%2Fsrs%2Fepsg.xml%234326%22%20xmlns%3Agml%3D%22http%3A%2F%2Fwww.opengis.net%2Fgml%22%3E%3Cgml%3AouterBoundaryIs%3E%3Cgml%3ALinearRing%3E%3Cgml%3Acoordinates%20decimal%3D%22.%22%20cs%3D%22%2C%22%20ts%3D%22%20%22%3E";
				// loop geom
				
				var coords = poly.geometry.coordinates[0];
				
				var i;
				for (i = 0; i < coords.length; i++) 
				{
					boundedUrl += coords[i][0] + "%2C";
					boundedUrl += coords[i][1] + "%20";
				}
				
				boundedUrl += "%3C%2Fgml%3Acoordinates%3E%3C%2Fgml%3ALinearRing%3E%3C%2Fgml%3AouterBoundaryIs%3E%3C%2Fgml%3APolygon%3E%3C%2FIntersects%3E%3C%2FFilter%3E";
        		
				var url = SMK.MAP[1].$viewer.resolveAttachmentUrl( boundedUrl, ly.id, 'json' )

		        return SMK.UTIL.makePromise( function ( res, rej ) {
	                $.get( url, null, null, 'json' ).then( res, function ( xhr, status, err ) { 
	                    rej( 'Failed requesting ' + url + ': ' + xhr.status + ',' + err ) 
	                } )
	            } )
	            .then( function ( data ) {
	                console.log( 'loaded', url )
	                // if it's a regular layer, just add the data
	                if(!viewerLayer.hasOwnProperty("_topClusterLevel")) // raw
            		{
	                	viewerLayer.clearLayers();
	                	viewerLayer.addData( data )
            		}
	                else // clustered
                	{
	                	SMK.MAP[1].$viewer.map.removeLayer( viewerLayer );
	                	viewerLayer = SMK.TYPE.Layer[ 'vector' ][ 'leaflet' ].createClusterLayer(data, ly);
	                	SMK.MAP[1].$viewer.map.addLayer( viewerLayer );
	                	// replace stored layer with new layer
	                	SMK.MAP[1].$viewer.visibleLayer[ ly.id ] = viewerLayer;
                	}
	                // heatmap (identical to clustered really)
	                return viewerLayer
	            } )
	            .then( function ( layer ) {
	                if ( !ly.useHeatmap ) return layer

					var points = [];
					var intensity = 100;

					viewerLayer.eachLayer( function ( ly ) {
						var centroid = turf.centroid( ly.feature.geometry )
						points.push( [ centroid.geometry.coordinates[ 1 ], centroid.geometry.coordinates[ 0 ], intensity ] )
					});

					return L.heatLayer( points, { radius: 25 } )
	            } )
			}
		});
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    ViewerLeaflet.prototype.getPanelPadding = function ( panelVisible ) {
        var overlayPadding = parseInt( this.getVar( 'overlay-padding' ) )
        var panelPadding = 10 
        var padding = overlayPadding + panelPadding
        
        var width = parseInt( this.getVar( 'panel-width' ) )
        var bottom = parseInt( this.getVar( 'panel-bottom' ) )
        var size = this.map.getSize()

        if ( !panelVisible )
            return {
                topLeft: L.point( padding, padding ),
                bottomRight: L.point( padding, padding ),
            }

        if ( bottom > 0 )
            return {
                topLeft: L.point( padding, size.y - overlayPadding - bottom + panelPadding ),
                bottomRight: L.point( padding, padding ),
            }

        return {
            topLeft: L.point( width + padding, padding ),
            bottomRight: L.point( padding, padding ),
        }
    }
    //
    // ViewerLeaflet.prototype.zoomToFeature = function ( layer, feature ) {
    //     this.map.fitBounds( feature.highlightLayer.getBounds(), {
    //         paddingTopLeft: L.point( 300, 100 ),
    //         animate: false
    //     } )
    // }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    // ViewerLeaflet.prototype.getCurrentLocation = function () {
    //     var self = this

    //     return SMK.UTIL.makePromise( function ( res, rej ) {
    //         self.map.on( {
    //             locationfound: res,
    //             locationerror: rej
    //         } )
    //         self.map.locate( { maximumAge: 10 * 1000 } )
    //     } )
    //     .finally( function () {
    //         self.map.off( 'locationfound' )
    //         self.map.off( 'locationerror' )
    //     } )
    //     .then( function ( ev ) {
    //         return {
    //             map: {
    //                 latitude: ev.latlng.lat,
    //                 longitude: ev.latlng.lng
    //             }
    //         }
    //     } )
    // }
} )

