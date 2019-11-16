include.module( 'layer-esri3d.layer-vector-esri3d-js', [ 'layer.layer-vector-js', 'types-esri3d', 'util-esri3d', 'turf' ], function () {
    "use strict";

    var E = SMK.TYPE.Esri3d
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    function VectorEsri3dLayer() {
        SMK.TYPE.Layer[ 'vector' ].prototype.constructor.apply( this, arguments )
    }

    $.extend( VectorEsri3dLayer.prototype, SMK.TYPE.Layer[ 'vector' ].prototype )

    SMK.TYPE.Layer[ 'vector' ][ 'esri3d' ] = VectorEsri3dLayer
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    VectorEsri3dLayer.prototype.getFeaturesInArea = function ( area, view, option ) {
        var self = this

        if ( !option.layer ) return

        var features = []

        option.layer.sourceFeaures.forEach( function ( gr ) {
            var gm = gr.attributes._geojsonGeometry

            var ft = {
                type: 'Feature',
                properties: Object.assign( {}, gr.attributes ),
                geometry: gm
            }
            delete ft.properties._geojsonGeometry

            switch ( gm.type ) {
            case 'Polygon':
                if ( turf.intersect( ft, area ) )
                    features.push( ft )
                break

            case 'MultiPolygon':
                var intersect = gm.coordinates.reduce( function ( accum, poly ) {
                    return accum || !!turf.intersect( turf.polygon( poly ), area )
                }, false )
                if ( intersect ) features.push( ft )
                break

            case 'LineString':
                if ( turf.booleanCrosses( area, ft ) ) features.push( ft )
                break

            case 'MultiLineString':
                var close1 = turf.segmentReduce( ft, function ( accum, segment ) {
                    return accum || turf.booleanCrosses( area, segment )
                }, false )
                if ( close1 ) features.push( ft )
                break

            case 'Point':
            case 'MultiPoint':
                var close2 = turf.coordReduce( ft, function ( accum, coord ) {
                    return accum || turf.booleanPointInPolygon( coord, area )
                }, false )
                if ( close2 ) features.push( ft )
                break

            default:
                console.warn( 'skip', gm.type )
            }
        } )

        return features
    }
    
    function hexToRgb(hex) {
    	  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    	  return result ? {
    	    r: parseInt(result[1], 16),
    	    g: parseInt(result[2], 16),
    	    b: parseInt(result[3], 16)
    	  } : null;
    	}
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    SMK.TYPE.Layer[ 'vector' ][ 'esri3d' ].create = function ( layers, zIndex ) {
        var self = this;

        if ( layers.length != 1 ) throw new Error( 'only 1 config allowed' )
        
        var dataUrl = layers[ 0 ].config.dataUrl;
        if(layers[0].config.isWfs) dataUrl += "&maxFeatures=1";
        
        // add any filter expression here as well
        
        var url = this.resolveAttachmentUrl( dataUrl, layers[ 0 ].config.id, 'json' )

        return SMK.UTIL.makePromise( function ( res, rej ) {
            $.get( url, null, null, 'json' ).then( function ( doc ) {
                res( doc )
            }, function () {
                rej( 'request to ' + url + ' failed' )
            } )
        } )
        .then( function ( geojson ) 
        {
            var symbol = SMK.UTIL.smkStyleToEsriSymbol( layers[ 0 ].config.style, self )

            // can probably throw symbols away?
            // With ArcGIS rendering, we can apply any feature class rendering info we want
            // maybe add a new attribute to hold the a custom renderer, or fetch from MPCM? 
            
            var renderer = {};
            var geomType;
            if(geojson.features[0].geometry.type.includes("Polygon"))
        	{
            	geomType = "polygon";
            	
            	var strokeColor = hexToRgb(layers[ 0 ].config.style.strokeColor);
            	var fillColor = hexToRgb(layers[ 0 ].config.style.fillColor);
            	
            	renderer = 
                {
    				type: "simple",
    				symbol:
    				{
    				  type: "simple-fill",
    				  outline: {
    				    width: layers[ 0 ].config.style.strokeWidth + "px",
    				    cap: "round",
    				    join: "round",
    				    color: [strokeColor.r, strokeColor.g, strokeColor.b, layers[ 0 ].config.style.strokeOpacity]
    				  },
    				  color: [fillColor.r, fillColor.g, fillColor.b, layers[ 0 ].config.style.fillOpacity]
    				}
    			};
        	}
            else if(geojson.features[0].geometry.type.includes("Point")) // check for multipoint
        	{
            	geomType = "point";
            	
            	var strokeColor = hexToRgb(layers[ 0 ].config.style.strokeColor);
            	var fillColor = hexToRgb(layers[ 0 ].config.style.fillColor);
            	
            	var symbol = {}
            	if(layers[ 0 ].config.style.markerUrl)
        		{
            	  symbol =
				  {
					  type: "picture-marker",
					  url: "./" + layers[ 0 ].config.style.markerUrl,
					  width: layers[ 0 ].config.style.markerSize[0],
					  height: layers[ 0 ].config.style.markerSize[1]
				  }
        		}
            	else
        		{
            		symbol = 
            		{
           				type: "simple-marker",
           				size: layers[ 0 ].config.style.markerSize[0],
           				color: [fillColor.r, fillColor.g, fillColor.b, layers[ 0 ].config.style.fillOpacity],
           				outline: {
           					width: layers[ 0 ].config.style.strokeWidth + "px",
           					cap: "round",
           					join: "round",
           					color: [strokeColor.r, strokeColor.g, strokeColor.b, layers[ 0 ].config.style.strokeOpacity]
    				    }
           			}
        		}
            	
            	renderer = 
                {
            		type: "simple",
           			symbol: symbol
    			};
        	}
            else if(geojson.features[0].geometry.type.includes("LineString"))
        	{
            	geomType = "polyline";
            	var strokeColor = hexToRgb(layers[ 0 ].config.style.strokeColor);
            	
            	renderer = 
                {
           			type: "simple",
           			symbol: {
           				type: "simple-line",
           				color: [strokeColor.r, strokeColor.g, strokeColor.b, layers[ 0 ].config.style.strokeOpacity],
        			  	width: layers[ 0 ].config.style.strokeWidth + "px"
           			}
    			};
        	}
            
            var sourceFeatures = SMK.UTIL.geoJsonToEsriGeometry( geojson, function ( t ) { return symbol[ t ] } );
            
            // build fields (probably only need Object ID, definition expression, and the Label fields?)
            var fields = [];
            
            var i = 0;
            for(i = 0; i <  Object.keys(sourceFeatures[0].attributes).length; i++)
    		{
            	var akey = Object.keys(sourceFeatures[0].attributes)[i];
        		var type = akey.toLowerCase() == "objectid" ? "oid" : "string";
            	
            	fields.push({ name: akey, type: type });
    		}
            
            // label renderer
            var labelRender = null;
            if(layers[ 0 ].config.titleAttribute)
            {
	            labelRender = 
	            [
					{
						// When using callouts on labels, "above-center" is the only allowed position
						labelPlacement: "above-center",
						labelExpressionInfo: 
						{
							value: "{" + layers[ 0 ].config.titleAttribute + "}"
						},
						symbol:
						{
							type: "label-3d", // autocasts as new LabelSymbol3D()
							symbolLayers:
							[
								{
									type: "text", // autocasts as new TextSymbol3DLayer()
									material:
									{
										color: "black"
									},
									halo:
									{
										color: [255, 255, 255, 0.7],
										size: 2
									},
									size: 10
								}
							],
							// Labels need a small vertical offset that will be used by the callout
							verticalOffset:
							{
								screenLength: 150,
								maxWorldLength: 2000,
								minWorldLength: 30
							},
							// The callout has to have a defined type (currently only line is possible)
							// The size, the color and the border color can be customized
							callout:
							{
								type: "line", // autocasts as new LineCallout3D()
								size: 0.5,
								color: [0, 0, 0],
								border:
								{
									color: [255, 255, 255, 0.7]
								}
							}
						}
					}
				];
            }
            
            return new E.layers.FeatureLayer( 
            {
            	source: sourceFeatures,
            	sourceFeaures: sourceFeatures, // cache helper for handling the delete process.
            	minScale: 0,
            	maxScale: 0,
            	refreshInterval: 0.1,
            	geometryType: geomType,
            	screenSizePerspectiveEnabled: true,
            	outFields: ["*"],
            	title: layers[ 0 ].config.title,
            	objectIdField: "OBJECTID",
            	fields: fields,
            	renderer: renderer,
            	labelingInfo: labelRender
            } )
        } )
    }

} )
