include.module( 'tool-pan-leaflet', [ 'tool-pan', 'leaflet' ], function () {
    "use strict";

    SMK.TYPE.PanTool.prototype.afterInitialize.push( function ( smk ) 
    {
    	if(smk.viewer.type != "leaflet") return;
    	
    	smk.$viewer.map.dragging.enable();
    } )

} )

