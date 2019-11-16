include.module( 'tool-coordinate', [ 'tool', 'tool-coordinate.coordinate-html' ], function ( inc ) {
    "use strict";

    function CoordinateTool( option ) {
        SMK.TYPE.Tool.prototype.constructor.call( this, $.extend( {
            order: 3
        }, option ) )
    }

    SMK.TYPE.CoordinateTool = CoordinateTool

    $.extend( CoordinateTool.prototype, SMK.TYPE.Tool.prototype )
    CoordinateTool.prototype.afterInitialize = []
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    SMK.TYPE.CoordinateTool.prototype.afterInitialize.push( function ( smk ) {
        var self = this

        if ( smk.$device == 'mobile' ) return

        if(smk.viewer.type == "esri3d")
    	{
        	var coordCnv = new SMK.TYPE.Esri3d.widgets.CoordinateConversion( { view: smk.$viewer.view } );
        	
            smk.$viewer.view.ui.add( 
            [
               {
                  component: coordCnv,
                  position: 'bottom-right'
               }
            ]);

            var numberSearchPattern = /-?\d+[\.]?\d*/;
            
            var bcAlbers = new SMK.TYPE.Esri3d.widgets.CoordinateConversion.support.Format(
            {
            	name: "BC Albers",
                conversionInfo: 
                {
                  spatialReference: new SMK.TYPE.Esri3d.geometry.SpatialReference({ wkid: 3005 }),
                  reverseConvert: function(string, format) 
                  {
                	  var parts = string.split(",");
                	  return new SMK.TYPE.Esri3d.geometry.Point(
                	  {
                		  x: parseFloat(parts[0]),
                		  y: parseFloat(parts[1]),
                		  spatialReference: { wkid: 3005 }
                      });
                  }
                },
                coordinateSegments: 
                [
                    {
                    	alias: "X",
                    	description: "easting",
                    	searchPattern: numberSearchPattern
                    },
                    {
                    	alias: "Y",
                    	description: "northing",
                    	searchPattern: numberSearchPattern
                    }
                ],
                defaultPattern: "X, Y"
              });
        	
              coordCnv.formats.add(bcAlbers);
        	  coordCnv.conversions.splice(0, new SMK.TYPE.Esri3d.widgets.CoordinateConversion.support.Conversion({ format: bcAlbers }));
    	}
        else
        {
	        this.model = {
	            latitude: null,
	            longitude: null,
	        }
	
	        this.vm = new Vue( {
	            el: smk.addToStatus( inc[ 'tool-coordinate.coordinate-html' ] ),
	            data: this.model,
	        } )
	
	        smk.$viewer.changedLocation( function ( ev ) {
	            if ( ev.map && ev.map.latitude ) {
	                self.model.latitude = ev.map.latitude
	                self.model.longitude = ev.map.longitude
	            }
	            else {
	                self.model.latitude = null
	                self.model.longitude = null
	            }
	        } )
        }
    } )

    return CoordinateTool
} )




