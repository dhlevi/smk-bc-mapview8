include.module( 'tool-location', [ 'tool', 'widgets', 'tool-location.panel-location-html' ], function ( inc ) {
    "use strict";

    Vue.component( 'location-panel', {
        extends: inc.widgets.toolPanel,
        template: inc[ 'tool-location.panel-location-html' ],
        props: [ 'site', 'tool' ]
    } )

    function LocationTool( option ) {
        this.makeProp( 'site', {} )
        this.makeProp( 'tool', {} )

        SMK.TYPE.Tool.prototype.constructor.call( this, $.extend( {
            class:      'smk-location-panel',
            title:      'Location',
            position:   'toolbar',
            panelComponent: 'location-panel',
        }, option ) )
    }


    SMK.TYPE.LocationTool = LocationTool

    $.extend( LocationTool.prototype, SMK.TYPE.Tool.prototype )
    LocationTool.prototype.afterInitialize = []
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    LocationTool.prototype.afterInitialize.push( function ( smk ) {
        var self = this

        this.setIdentifyHandler = function ( handler ) {
            if ( !smk.$tool.identify ) return

            self.tool.identify = !!handler

            self.identifyHandler = handler || function () {}
        }
        self.identifyHandler = function () {}
        
        this.setDirectionsHandler = function ( handler ) {
            if ( !smk.$tool.directions ) return

            self.tool.directions = !!handler

            self.directionsHandler = handler || function () {}
        }
        self.directionsHandler = function () {}

        // if ( smk.$tool.measure )
        //     this.tool.measure = true

        smk.on( this.id, {
            'identify': function () {
                self.identifyHandler()
            },

            'measure': function () {
            },

            'directions': function () {
                self.directionsHandler()
            }
        } )

        smk.$viewer.handlePick( 1, function ( location ) {
            self.active = true
            self.site = location.map
            self.pickLocation( location )

            self.setDirectionsHandler()
            self.setIdentifyHandler( function () {
                self.reset()
                smk.$viewer.identifyFeatures( location )
            } )

            return SMK.UTIL.findNearestSite( location.map )
                .then( function ( site ) {
                    self.site = site

                    self.setDirectionsHandler( function () {
                        self.reset()
                        smk.$tool.directions.active = true

                        smk.$tool.directions.activating
                            .then( function () {
                                return smk.$tool.directions.startAtCurrentLocation()
                            } )
                            .then( function () {
                                return smk.$tool.directions.addWaypoint( site )
                            } )
                    } )

                    return true
                } )
                .catch( function ( err ) {
                    return true
                } )
        } )

        this.pickLocation = function ( location ) {} 

        this.reset = function () {
            this.site = {}
            this.active = false
            self.setDirectionsHandler()
            self.setIdentifyHandler()
        }

        smk.$viewer.changedView( function () {
            self.reset()
        } )

        self.changedActive( function () {
            if ( !self.active )
                self.reset()
        } )
    } )

    return LocationTool
} )
