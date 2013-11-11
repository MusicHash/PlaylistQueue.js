/*! 
	jQuery PlaylistQueue plugin
	@name jquery.playlist_queue.js
	@author Oleg Glozman (oleg.glozman@gmail.com)
	@version v0.6.2
	@date 06/11/2013
	@category jQuery plugin
	@copyright (c) 2013 Oleg Glozman
	@license Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
*/
;(function ($) {
    var PlaylistQueue,
        defaults = {},
        __bind;

    /**
     * Context switcher, used for public API exposure.
     *
     * @param {function} func - Desired function for content switching.
     * @param {Object} context - Dsired context to bind the function to.
     * @return {function} - Bind referance function with this context switched
     */
    __bind = function (func, context) {
        return function () {
            return func.apply(context, arguments);
        };
    };


    /**
     * PlaylistQueue default options
     *
     * @namespace
     * @name defaults
     */
    defaults = {
        skin: 'orange',
        target: {
            container: 'body'
        },
        ids: {
            droppableWidget: 'droppableWidget',
            queueList: 'queueList',
            queueListWrapper: 'queueListWrapper',
            player: 'player',
			playerBox: 'playerBox',
            playerBack: 'playerBack',
            nowStreaming: 'now-streaming',
        },

        sortable: {
            distance: 30,
            tolerance: 'pointer',
            zIndex: 200
        },

        // Callback API
        onActiveChange: function (item) {}, // Fired when Active item set / changed.
        onPlay: function (item) {}, // Fired onPlay
        onPause: function (item) {}, // Fired onPause
        onSortStart: function (item) {}, // Fired on sort on the queue list begins.
        onSortChange: function (item) {}, // Fired after queue list order changed.
        onSortBeforeStop: function (item) {}, // Fired on sort on the queue list ends.
        onRemove: function (item, idx) {}, // Fired when item is removed from the list or dragged out.
        onEmpty: function () {} // Fired when the sort list is empty
    };

    //PlaylistQueue: Object
    PlaylistQueue = function (options) {
        var publicAPI = {},
            api = $.extend({}, defaults, options),
            touch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
            methods = {};


        /**
         * Private PlaylistQueue methods
         *
         * @namespace
         * @name methods
         */
        methods = {
            /** @private */
			el: null,
            
            
			/** @private */
            isDropValid: false,
            
                        
            /** @private */
            lastActiveItem: null,


            /**
             * Init function to draw layout and reset
             */
            bootstrap: function () {
                this.reset();   		// Reset defaults
                this.layout();   		// Draw plugin layout
                this.jQueryUIInit();	// start jQuery listeners.
            },


            /**
             * Resets the object to defaults, fired on init and when list is empty.
             */
            reset: function () {
                this.lastActiveItem = null;
                this.isDropValid = null;
            },


            /**
             * Appends layout to the body
             */
            layout: function () {
            	if (-1 !== $('#'+api.ids.droppableWidget).index()) return;
            	
                this._appender(this.view.droppableSortUI(), api.target.container);
                this.getDroppableWidget().addClass(api.skin);
                this.subscribeListener();
            },
            
            
            jQueryUIInit: function() {
                this.initJqueryDraggable();                     // Init the draggable zone, jQueryUI function
                this.initJquerySortable();                      // Init the Sortable/Droppable zone, jQueryUI function
			},
            
            
            /**
             * Verify all view object exists on the screen, checks if the sortable / draggable are bind ok, if NOT, rebinds.
             * Made for DOM object removing and adding, backbone.js page swaping etc.
             * Reinitates the Draggable zone, unbinds old objects.
             */
            verifyInstance: function(el) {
				if (this.getDraggableObject().length === el.length) return;
				
                this.destructJqueryDraggable(); // clean up, object has been removed from DOM and 
                
                // replace the old drag object.
                this.setEl(el);
                this.initJqueryDraggable();
            },


            /**
             * View object, contains the plugin HTML structure.
             *
             * @namespace
             * @name view
             */
            view: {

                /**
                 * HTML structure of the dropped object into the sortable zone.
                 *
                 * @param {object} JSON artist - Object defines the artist, contains ID and title.
                 * @param {object} JSON album - Object defines the album, contains ID and title.
                 * @param {object} JSON song - Object defines the song, contains ID and title.
                 * @param {string} imagePath - HTTP path to the thumbnail.
                 * @return {string} HTML
                 */
                droppableSongUI: function (artist, album, song, imagePath) {
                    var html = [
                        '<div class="widget-item">',
                        	'<div class="widget-action remove"></div>',
                        	'<div class="widget-action play"></div>',
                        	'<div class="widget-action pause hide"></div>',
                        	'<div class="widget-item-label" title="' + album.title + '">',
                        		'<em><figure><img src="' + imagePath + '" alt=""/></figure></em>',
                        		'<h4>' + song.title + '</h4>',
                        		'<strong>' + artist.title + '</strong>',
                        	'</div>',
                        '</div>'
                    ];

                    return $(html.join(' '));
                },


                /**
                 * HTML structure of the dragged tooltip, trigged also on sorting.
                 *
                 * @param {object} JSON artist - Object defines the artist, contains ID and title.
                 * @param {object} JSON album - Object defines the album, contains ID and title.
                 * @param {object} JSON song - Object defines the song, contains ID and title.
                 * @return {string} HTML
                 */
                draggableTooptipSongUI: function (artist, album, song) {
                    var html = [
                        '<div class="player-widget-drag">',
                        	'<div class="widget-drag-status invalid"></div>',
                        	'<div class="drag-label">',
                        		'<span>' + artist.title + ' - ' + song.title + '</span>',
                        		'<em>(' + album.title + ')</em>',
                        	'</div>',
                        '</div>'
                    ];

                    return $(html.join(' '));
                },


                /**
                 * HTML structure of the droppable/sortable zone. Contains also the placeholder for the
                 * mediaplayer which can be triggered and controlling the widget.
                 *
                 * @return {string} HTML
                 */
                droppableSortUI: function () {
                    var html = [
                        '<div id="' + api.ids.droppableWidget + '" class="droppableQueue medium empty">',
                            '<div id="'+ api.ids.playerBox +'" class="player-box">',
                    			'<div id="'+ api.ids.player +'">',
                    				'<div id="'+ api.ids.nowStreaming +'">',
                    				'</div>',
                    			'</div>',

                        		'<div id="' + api.ids.playerBack + '" class="player-back"></div>',
                        	'</div>',

                        	'<div id="' + api.ids.queueListWrapper + '" class="queue-list-wrapper">',
                        		'<ol id="' + api.ids.queueList + '" class="queue-list"></ol>',
                        	'</div>',
                        '</div>'
                    ];

                    return $(html.join(' '));
                },
                
                
                /**
                 * Custom helper function to re-design the dragged/sorted tooltip while being dropped.
                 * if is not set, the original object will be dragged (default helper: 'clone')
                 * @see: http://api.jqueryui.com/sortable/#option-helper
                 *
                 * @param {object} e - Event, generated by jQueryUI.
                 * @param {object} ui - UI Object, generated by jQueryUI.
                 * @return {string} HTML
                 */
                dragHelper: function (e, ui) {
                    var element = ui || $(this);

                    return methods.view.draggableTooptipSongUI(element.data('artist'), element.data('album'), element.data('song'));
                }
            },
            

            /**
             * Subscribe to UI events, add collapse option for the whole bottom nav
             * and prevents the player from effecting it while being clicked.
             * 
             * @return {object} this
             */
            subscribeListener: function() {
                var widget = this.getDroppableWidget();
                
                // Collapsable player ability.
                widget.find('#'+api.ids.playerBox).on('click', function() {
                    widget.toggleClass('collapse');
                });
                
                // Prevents the background from being clickable and collapsable on an undesired locations.
                widget.find('#'+api.ids.nowStreaming).on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            },
            
            
            /**
             * Initialize draggable zone of songs to be dropped into the sortable queue.
             * 
             * @return {object} this
             */
            initJqueryDraggable: function () {
                return this.getDraggableObject()
                    .find('.item-wrapper')
                    .draggable({
                        cursorAt: {
                            left: 0,
                            top: 0
                        },
                        appendTo: document.body,
                        containment: 'window',
                        tolerance: api.sortable.tolerance,
                        zIndex: api.sortable.zIndex,

                        helper: this.view.dragHelper, // Custom UI object of the draggable tooltip
                        connectToSortable: this.getQueueList()
                    });
            },
            
            
            /**
             * Destory Draggable Object, called once object detected as removed from DOM.
             * 
             * @return {object} this
             */
            destructJqueryDraggable: function () {
                return this.getDraggableObject()
                    .find('.item-wrapper')
                    .draggable('destroy');
            },


            /**
             * Initialize the sortable queue of items. draggable must be init before as both lists are connected.
             * 
             * @return {object} this
             */
            initJquerySortable: function () {
                var self = this;

                return this.getQueueList()
                    .disableSelection()
                    .sortable({
                        distance: api.sortable.distance,
                        tolerance: api.sortable.tolerance,
                        cursorAt: {
                            left: 0,
                            top: 0
                        },
                        containment: 'parent',
                        handle: '.widget-item',
                        placeholder: 'drop-indicator cancel',
                        containment: 'window',
                        cancel: '.cancel',


                        helper: this.view.dragHelper, // Custom UI object of the draggable tooltip


                        start: function (e, ui) {
                            $(this).removeData('newlyDropped');
                            self._onSortStart(ui.item);

                            if ('undefined' === typeof (ui.helper.context)) {
                                ui.item.show(); //display item while being sorted (do not display while being dropped)
                            }
                        },

                        receive: function (e, ui) {
                            //drop new item to the sortable
                            var newlyDropped = $(this).data('newlyDropped'),
                                uniqueID = self._generateUniqueID(),
                                context = this; // if context is correct should be equal to this.getQueueList()

                            var html = self.view.droppableSongUI(newlyDropped.data('artist'), newlyDropped.data('album'), newlyDropped.data('song'), newlyDropped.data('thumb'));
                            newlyDropped.attr({
                                'id': uniqueID
                            });

                            $(html).find('.play').on('click', function () {
                                self.queuePlayItem(newlyDropped);
                            });

                            $(html).find('.pause').on('click', function () {
                                self.queuePauseItem(newlyDropped);
                            });

                            $(html).find('.remove').on('click', function () {
                                self.queueUpdated(newlyDropped, true);
                            });

                            $(html).find('strong').on('click', function () {
                                self.queueGoToArtist(newlyDropped);
                            });

                            newlyDropped.html(html);
                        },


                        update: function (e, ui) {
                            self.queueUpdated(ui.item);
                            self._onSortChange(ui.item);
                        },


                        over: function () {
                            self.isDropValid = true;
                            self.dragToolTipStatus();
                        },


                        out: function () {
                            self.isDropValid = false;
                            self.dragToolTipStatus();
                        },


                        beforeStop: function (e, ui) {
                            self._onSortBeforeStop(ui.item);
 
                            $(this).data('newlyDropped', ui.item);
                            if (false === self.isDropValid) {
                                self.queueUpdated(ui.item, true);
                                self.isDropValid = false;
                            }
                        }
                    });
            },
            
            
            /**
             * Gets the queue size of playlist.
             *
             * @return {Number}
             */
            getSize: function () {
                return this.getQueueList().find('li:not(.cancel)').size();
            },


            /**
             * 
             */
            queueUpdated: function (item, toRemove) {
                var queueSize = this.getSize(),
                    itemPosition = $(item).index();

                if (true === toRemove) {
                    this._onRemove($(item), itemPosition);
                    item.remove();
                    queueSize--;
                }

                if (0 >= queueSize) {
                    this.getDroppableWidget().addClass('empty');
                    this._onEmpty();
                } else
                    this.getDroppableWidget().removeClass('empty');

                //active song has been changed, set the next on active mode.
                if (null === this.getActive()) {
                    //the active was the last on the playlist, select the new last.
                    if (itemPosition === queueSize)
                        itemPosition = queueSize - 1;

                    if (0 < queueSize) {
                        this.setActive(itemPosition);
                        this._onPlay(this._getItemByIndex(itemPosition));
                    }
                }
            },


            /**
             * Validate the drop zone and set proper class according to the current position of the tooltip.
             *
             * @return {object} this
             */
            dragToolTipStatus: function () {
                var obj = $('.player-widget-drag .widget-drag-status'),
                    valid = this.isDropValid;

                if (true === valid)
                    obj.removeClass('invalid');
                else
                    obj.addClass('invalid');

                return this;
            },


            /**
             * Action triggered when the 'Play' btn clicked in the queue.
             */
            queuePlayItem: function (item) {
                this.setActive(($(item)).index());
                this._onPlay($(item));
            },


            /**
             * Action triggered when the 'Pause' btn clicked in the queue.
             */
            queuePauseItem: function (item) {
                this._onPause($(item));
            },


            /**
             * Check the state of the song, if playing or not.
             *
             * @return {bool} 
             */
            isPlaying: function () {
                var playing = this.getQueueList().find('li.active').find('.play.hide').index();

                return (0 > playing) ? false : true;
            },
            
            
            /**
             * Action triggered when the artist field is clicked.
             */
            queueGoToArtist: function (item) {
                var artist = $(item).data('artist').title;

                //location.href = '#/artist/'+artist;
                console.log(artist);
            },


            /**
             * Get the active song from the queue and the next and previous songs as an option
             *
			 * @param {Number} prevNext (-1 - previous song, 0 - current song (default value), 1 - next song)
			 * @return {object} jQuery selector of the active object (or next, previous.. etc.)
             */
            getActive: function (prevNext) {
                var queueSize = this.getSize() - 1, //index
                    item = (-1 === this.getQueueList().find('li.active').index()) ? null : this.getQueueList().find('li.active'),
                    direction = prevNext || 0,
                    ret = null,
                    index = null;

                if (null !== item) {
                    index = item.index() + direction;

                    if (0 <= index)
                        ret = this._getItemByIndex(index);
                }

                return ret;
            },


            /**
             * Sets the active queue item by IndexID.
             *
             * @param {Number} index - index of the item to be set active.
             * @return {object} jQuery selector of the new active object after the change
             * 
             * @todo: make better, remove the last active more efficently - keep track of the last played item. (might become an issue on longer lists)
             */
            setActive: function (index) {
                var item = this._getItemByIndex(index);

				// verify if index exists.
                if (null === item ||
                    (
                        null !== this.getActive() &&
                        (this.getActive().index() === item.index() && true === this.isPlaying()) //prevent from re-setting the current active item again.
                    )
                ) return null; //now playing similar to currently playing song.
                
                // Sets active flag on the index
                this.getQueueList().find('li').removeClass('active');
                item.addClass('active');

				// Fires the event notifying the item change.
                this._onActiveChange(item);
                
                return item;
            },
            
            
            /**
             *
             */
            setPlayPauseMode: function (playMode, revert, item) {
                var activeItem = item || this.getActive(),
                    mode = playMode || 0, // 1 - play, 0 - pause
                    revertMode = revert || false;

                if (null !== this.lastActiveItem && true === revertMode) {
                    this.lastActiveItem.find('.pause').addClass('hide');
                    this.lastActiveItem.find('.play').removeClass('hide');
                }

                if (1 === mode) {
                    activeItem.find('.pause').removeClass('hide');
                    activeItem.find('.play').addClass('hide');
                } else {
                    activeItem.find('.play').removeClass('hide');
                    activeItem.find('.pause').addClass('hide');
                }

                return this;
            },


            /**
             *
             */
            getDroppableWidget: function () {
                return $('#' + api.ids.droppableWidget);
            },
            
            
            /**
             *
             */
            getDraggableObject: function () {
                return this.el;
            },


            /**
             *
             */
            getQueueList: function () {
                return $('#' + api.ids.queueList);
            },


            /**
             *
             */
            _getItemByIndex: function (index) {
                var item = this.getQueueList().find('li:not(.cancel)').eq(index);

                return (0 > item.index()) ? null : item;
            },


            /**
             *
             */
            setEl: function (el) {
            	this.el = el;
            	
                return this;
            },
            
            
            /**
             *
             */
            getEl: function () {
                return this.el;
            },
            

            /**
             * Random ID generator for appended objects.
             *
             * Math.random should be unique because of its seeding algorithm.
             * Convert it to base 36 (numbers + letters), and grab
             * the first 9 characters after the decimal.
             *
             * @return {string} - Sample ID looks like: "_619z73eci"
             */
            _generateUniqueID: function () {
                return '_' + Math.random().toString(36).substr(2, 9);
            },


            /**
             * Appending wrapper, used to inject HTML string to a target container.
             *
             * @param {string} source - string HTML structure to be inserted.
             * @param {mixed} target - selector for the target of the host.
             *
             * @return {object} - source referance after injected to the DOM.
             */
            _appender: function (source, target) {
                return $(source).appendTo(target);
            },


            /* Events */

            /**
             *
             */
            _onActiveChange: function (item) {
                var activeItem = item || this.getActive();
                api.onActiveChange(activeItem);

                this.setPlayPauseMode(0, true, activeItem); //clears from the lastActiveItem the play / pause modes for default UI.
                this.lastActiveItem = activeItem;

                return this;
            },


            /**
             *
             */
            _onPlay: function (item) {
                var activeItem = item || this.getActive();
                api.onPlay(activeItem);

                this.setPlayPauseMode(1, false, activeItem);

                return activeItem;
            },
            
            
            /**
             *
             */
            _onPause: function (item) {
                var activeItem = item || this.getActive();

                if (true === this.isPlaying()) {
                    this.setPlayPauseMode(0, false, activeItem);
                }

                api.onPause(activeItem);

                return activeItem;
            },


            /**
             *
             */
            _onEmpty: function () {
                this.reset();

                api.onEmpty();
                return this;
            },


            /**
             *
             */
            _onSortStart: function (item) {
                api.onSortStart(item);

                return this;
            },


            /**
             *
             */
            _onSortEnd: function (item) {
                api.onSortEnd(item);

                return this;
            },


            /**
             *
             */
            _onRemove: function (item, idx) {
                api.onRemove(item, idx);

                return this;
            },


            /**
             *
             */
            _onSortBeforeStop: function (item) {
                api.onSortBeforeStop(item);

                return this;
            },


            /**
             *
             */
            _onSortChange: function (item) {
                api.onSortChange(item);

                return this;
            }
        };


        // public API
        $.extend(publicAPI, {
            /**
             *
             */
            pause: __bind(function () {
                return this._onPause();
            }, methods),


            /**
             *
             */
            play: __bind(function () {
                return this._onPlay();
            }, methods),
            
            
            /**
             *
             */
            playPauseIcon: __bind(function (state) {
				var activeItem = this.getActive(),
					isPlay = ('pause' === state) ? 0 : 1;
                
				this.setPlayPauseMode(isPlay, false, activeItem);

				return activeItem;
            }, methods),
            

            /**
             *
             */
            getNext: __bind(function () {
                return this.getActive(1);
            }, methods),


            /**
             *
             */
            setNext: __bind(function () {
                var active = this.getActive(1);

                if (null !== active) {
                    this.setActive(active.index());
                    this._onPlay();
                }

                return active;
            }, methods),


            /**
             *
             */
            getPrevious: __bind(function () {
                return this.getActive(-1);

            }, methods),


            /**
             *
             */
            setPrevious: __bind(function () {
                var active = this.getActive(-1);

                if (null !== active) {
                    this.setActive(active.index());
                    this._onPlay();
                }

                return active;
            }, methods),


            /**
             *
             */
            setActive: __bind(function (index) {
                var active = this.setActive(index);
                this._onPlay();

                return active;
            }, methods),


            /**
             *
             */
            getCurrent: __bind(function () {
                return this.getActive();

            }, methods),


            /**
             *
             */
            getSize: __bind(function () {
                return this.getSize();

            }, methods),


            /**
             *
             */
            isPlaying: __bind(function () {
                return this.isPlaying();
            }, methods),
            
            
            /**
             *
             */
            setEl: __bind(function (el) {
				return this.setEl(el);
            }, methods),
            
            
            /**
             *
             */
            verifyInstance: __bind(function (el) {
                return this.verifyInstance(el);
            }, methods)
            
            
        });


        return publicAPI;
    };


    //PlaylistQueue: Plugin Function
    /**
     *
     */
    $.fn.playlistQueue = function (options) {
        // Helper strings to quickly perform functions on the draggable queue object.
        var args = Array.prototype.slice.call(arguments).slice(1)
			obj = null; //Convert it to a real Array object.

        if ('undefined' === typeof($.playlistQueueInstance)) {
			$.playlistQueueInstance = new PlaylistQueue(options || {});
			$.playlistQueueInstance.setEl(this).bootstrap();
        }
		
        if ('object' !== typeof(options)) {
            $.playlistQueueInstance.verifyInstance(this);
			
			if ('undefined' !== typeof(options)) {
            	obj = $.playlistQueueInstance[options].apply(this, args);
            }
            
			return obj;
        }
    };

})(jQuery);
