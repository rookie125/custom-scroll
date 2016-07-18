/**
 * 自定义滚动条 -- 不考虑IE
 */
;(function() {
    var scrollId = null;
    var isFirefox = window.navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;

    // 构造函数
    function CustomScroll(selector, opts) {

        scrollId = Math.random().toString(16).substr(2);
        this.scrollbarTimeout = null;
        this.options = {
            onScroll: null,
            onScrollTop: null,
            onScrollStop: null,
            onScrollBottom: null,
            preventDefault: false
        };
        extend(this.options, opts || {});

        this.view = typeof selector === 'object' ? selector : document.querySelector(selector);

        if (this.view === null) {
            console.error(selector + ' not a selector');
            return false;
        }

        this.init();
    }

    CustomScroll.prototype.init = function() {
        this.hiddenThumb = false;

        this.createScrollbar();

        this.handlerThumb();
        this.hideScrollbar();
        this.setEvents();

        this.dragThum();

        setLayout(this.view, {
            overflow: 'hidden'
        });
    }

    CustomScroll.prototype.setEvents = function() {
        var self = this;
        var timeout = null;

        // 鼠标滚动
        addEvent(this.view, isFirefox ? 'MozMousePixelScroll' : 'mousewheel', function(evt) {
            self.mousewheel(evt);
        });

        // 监听元素发生变化
        addEvent(this.view, this.view.tagName === 'TEXTAREA' ? 'input' : 'DOMSubtreeModified', function() {
            // ng-repeat会让多触发N次，所以处理多次只会触发最后一次
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                self.handlerThumb();
            }, 60);
        });

        // 滚动条显示消失
        addEvent(this.view, 'mouseenter', function() {
            self.handlerThumb();
            self.showScrollbar();
            self.hideScrollbar();
        });

        addEvent(this.scrollbar, 'mouseenter', function() {
            self.showScrollbar();
        });
        addEvent(this.scrollbar, 'mouseleave', function() {
            self.hideScrollbar();
        });

        addEvent(window, 'optimizedResize', function() {
            self.handlerThumb();
        });

        if (this.options.special) {
            var visible = false;
            addEvent(this.view, 'mousedown', function() {
                this.view.scrollTop = 0;
                setLayout(this.view, {overflow: 'visible'});
                visible = true;
            }.bind(this));

            addEvent(document, 'mouseup', function() {
                setLayout(this.view, {overflow: 'hidden'});
                visible = false;
            }.bind(this));
        }
    }

    // 对外设置滚动条
    CustomScroll.prototype.doScrollTop = function(scrollTop) {
        var target = Number(scrollTop);
        var self = this;

        if (isNaN(target)) return;

        this.moveTo(target, function() {
            var scle = self.view.scrollTop / (self.view.scrollHeight - self.view.clientHeight);
            setLayout(self.scrollbarThumb, {
                transform: 'translateY('+ (scle * (self.scrollbar.offsetHeight - self.scrollbarThumb.offsetHeight)) +'px)'
            });
        });
    }

    CustomScroll.prototype.getScrollTop = function() {
        return this.view.scrollTop;
    }

    // 创建滚动条
    CustomScroll.prototype.createScrollbar = function() {
        var scrollbar = document.createElement('div');
        var top = this.view.offsetTop;

        setLayout(scrollbar, {
            position: 'absolute',
            marginRight: '2px',
            width: '6px',
            right: '0px',
            left: 'auto',
            top: this.view.offsetTop + 1 + 'px',
            bottom: '1px',
            transition: '.3s',
            background: 'rgba(0, 0, 0, 0)',
            opacity: 0.2,
            borderRadius: '5px',
            zIndex: 99
        })
        .innerHTML = '<span style="position: absolute; width: 4px; height: 50px; background: rgba(47, 47, 47, 0.54); border: 1px solid rgba(255, 255, 255, .2); border-radius: 10px;"></span>';

        this.view.parentNode.appendChild(scrollbar);
        this.scrollbar = scrollbar;
        this.scrollbarThumb = scrollbar.children[0];
    }

    CustomScroll.prototype.mousewheel = function(evt) {

        // 关闭现有的自动设置滚动
        clearInterval(this.view.interval);

        var down = evt.detail ? evt.detail < 0 : !(evt.wheelDelta < 0);
        var view = this.view;

        // 处理mac触控板触发多次问题
        if (view.scrollTop === 0 && down || view.scrollTop >= view.scrollHeight - view.clientHeight && !down) {
            return;
        }

        var scrollTop = 'wheelDeltaY' in evt ? Math.floor(evt.wheelDeltaY * 0.4) : Math.floor(evt.detail * -1 * 0.4);

        view.scrollTop -= scrollTop;

        // 设置Thumb
        var scle = view.scrollTop / (view.scrollHeight - view.clientHeight);

        setLayout(this.scrollbarThumb, {
            transform: 'translateY('+ (scle * (this.scrollbar.offsetHeight - this.scrollbarThumb.offsetHeight)) +'px)'
        });

        this.showScrollbar();

        // 停止滚动
        if (scrollTop === 0) {
            this.options.onScrollStop && this.options.onScrollStop(view.scrollTop);
            this.hideScrollbar();
        }

        // 向下且到顶
        if (view.scrollTop === 0 && down) {
            this.hideScrollbar();
            this.options.onScrollTop && this.options.onScrollTop(view.scrollTop);
        }
        // 向下且到底
        else if (view.scrollTop >= view.scrollHeight - view.clientHeight && !down) {
            this.hideScrollbar();
            this.options.onScrollBottom && this.options.onScrollBottom(view.scrollTop);
        }
        // 阻止默认行为
        else {
            this.options.onScroll && this.options.onScroll(view.scrollTop);
            evt.preventDefault();
        }

        this.options.preventDefault && evt.preventDefault();
    }

    CustomScroll.prototype.dragThum = function() {
        var self = this;

        addEvent(this.scrollbarThumb, 'mousedown', function(evt) {
            var oldY = getTranslateY(self.scrollbarThumb);
            var disY = evt.clientY;
            var thumbFixH = self.scrollbar.offsetHeight - self.scrollbarThumb.offsetHeight;
            var viewFixT = self.view.scrollHeight - self.view.clientHeight;

            addEvent(document, 'mousemove', function(evt) {
                var newY = oldY + (evt.clientY - disY);

                if (newY < 0) {
                    newY = 0;
                } else if (newY > thumbFixH) {
                    newY = thumbFixH;
                }

                var scale = newY / thumbFixH;

                self.view.scrollTop = scale * viewFixT;

                setLayout(self.scrollbarThumb, {
                    transform: 'translateY('+ newY +'px)'
                });
            });

            addEvent(document, 'mouseup', function() {
                removeEvent(document, 'mousemove');
                removeEvent(document, 'mouseup');
            });

            evt.cancelBubble = true;
            evt.preventDefault();
            return false;
        });
    }

    CustomScroll.prototype.showScrollbar = function() {
        if (this.view.scrollHeight === this.view.clientHeight) return;

        clearTimeout(this.scrollbarTimeout);
        setLayout(this.scrollbar, {opacity: 1});
    }

    CustomScroll.prototype.hideScrollbar = function() {
        this.scrollbarTimeout = setTimeout(function() {
            setLayout(this.scrollbar, {opacity: 0});
        }.bind(this), 1200);
    }

    //
    CustomScroll.prototype.moveTo = function(target, change) {
        var speed = 8;

        clearInterval(this.view.interval);
        this.view.interval = setInterval(function() {
            speed = (target - this.view.scrollTop) / 9;
            speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);

            this.view.scrollTop += speed;
            change && change();

            if (Math.abs(speed) <= 1) {
                clearInterval(this.view.interval);
                this.view.scrollTop = target;
                change && change();
            }
        }.bind(this), 16);
    }

    //
    CustomScroll.prototype.handlerThumb = function() {
        var height = this.calcThumb();
        var scle = this.view.scrollTop / (this.view.scrollHeight - this.view.clientHeight);

        setLayout(this.scrollbar, {
            opacity: this.hiddenThumb ? 0 : 1
        });

        setLayout(this.scrollbarThumb, {
            height: height + '%'
        });

        // 避免和高度同时设置不准的问题
        setLayout(this.scrollbarThumb, {
            transform: 'translateY('+ (scle * (this.scrollbar.offsetHeight - this.scrollbarThumb.offsetHeight)) +'px)'
        });
    }

    CustomScroll.prototype.calcThumb = function() {
        var height = this.view.clientHeight / this.view.scrollHeight * 100;

        if (height >= 100) {
            height = 100;
            this.hiddenThumb = true;
        }
        return height;
    }

    // 设置样式
    function setLayout(element, styles) {
        for(var attr in styles) {
            element.style[attr] = styles[attr];
        }
        return element;
    }

    function getTranslateY(element) {
        var transform = getComputedStyle(element, false).transform;
        return parseInt(transform.match(/(\d+(\.\d+)?)\)$/g)[0].replace(/\)/, ''), 10);
    }

    // 绑定事件
    function addEvent(obj, evt, evtFn) {
        removeEvent(obj, evt);
        var EvtFn = 'addEvent' + scrollId + evt;
        obj[EvtFn] = evtFn;
        obj.addEventListener(evt, obj[EvtFn], false);
    }

    function removeEvent(obj, evt) {
        var EvtFn = obj['addEvent' + scrollId + evt];
        if (typeof EvtFn === 'function') obj.removeEventListener(evt, EvtFn, false);
    }

    function extend(src, source) {
        for(var key in source) {
            source[key] !== undefined && (src[key] = source[key]);
        }
    }

    // optimize window.resize
    function throttle(type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function(event) {
            if (running) {
                return;
            }
            running = true;
            requestAnimationFrame(function() {
                var customEvent = event.detail !== null ?
                    new CustomEvent(name, {
                        detail: event.detail
                    }) : new CustomEvent(name)
                obj.dispatchEvent(customEvent);
                running = false;
            });
        };
        obj.addEventListener(type, func);
    }

    throttle("resize", "optimizedResize");

    window.CustomScroll = CustomScroll;
})();
