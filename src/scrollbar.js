(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :(function(){
    if(!global.ResizeObserver){
      console.error('Scrollbar 依赖 ResizeObserver');
      return;
    }
    global.Scrollbar = factory(global.ResizeObserver);
  })()
}(this, function (ResizeObserver) { 
  'use strict';
  
  const resizeHandler = function (entries) {
    for (const entry of entries) {
      const listeners = entry.target.__resizeListeners__ || []
      if (listeners.length) {
        listeners.forEach((fn) => { fn() })
      }
    }
  }
  function addResizeListener(element,fn) {
    if (!element.__resizeListeners__) {
      element.__resizeListeners__ = []
      element.__ro__ = new ResizeObserver(resizeHandler)
      element.__ro__.observe(element)
    }
    element.__resizeListeners__.push(fn)
  }
  function removeResizeListener(element,fn) {
    if (!element || !element.__resizeListeners__) return
    element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1)
    if (!element.__resizeListeners__.length) {
      element.__ro__.disconnect()
    }
  }
  function addUnit(value) {
    if (isString(value)) {
      return value
    } else if (isNumber(value)) {
      return value + 'px'
    }
    debugWarn(SCOPE, '属性 value 必须是 string 或 number 类型')
    return ''
  }
  const isArray = Array.isArray;
  const isString = (val) => typeof val === 'string';

  /* istanbul ignore next */
  function on(
    element,
    event,
    handler,
    useCapture = false
  ) {
    if (element && event && handler) {
      element?.addEventListener(event, handler, useCapture)
    }
  }

  /* istanbul ignore next */
  function off(
    element,
    event,
    handler,
    useCapture = false
  ) {
    if (element && event && handler) {
      element?.removeEventListener(event, handler, useCapture)
    }
  }

  function debugWarn(...args) {
    console.error(...args)
  }
  const SCOPE = 'MElScrollbar'
  const GAP = 4 // top 2 + bottom 2 of bar instance
  const BAR_MAP = {
    vertical: {
      offset: 'offsetHeight',
      scroll: 'scrollTop',
      scrollSize: 'scrollHeight',
      size: 'height',
      key: 'vertical',
      axis: 'Y',
      client: 'clientY',
      direction: 'top',
    },
    horizontal: {
      offset: 'offsetWidth',
      scroll: 'scrollLeft',
      scrollSize: 'scrollWidth',
      size: 'width',
      key: 'horizontal',
      axis: 'X',
      client: 'clientX',
      direction: 'left',
    },
  }

  function renderThumbStyle({ move, size, bar }) {
    const style = {};
    const translate = `translate${bar.axis}(${move}%)`

    style[bar.size] = size
    style.transform = translate
    style.msTransform = translate
    style.webkitTransform = translate

    return style
  }

  const bar = {
    inject: {
      scrollbar: { default: null }
    },
    props: {
      vertical: Boolean,
      size: String,
      move: Number,
      ratio: Number,
      always: Boolean,
    },
    data() {
      return {
        visible: false,
        barStore: {},
        cursorDown: null,
        cursorLeave: null,
        thumb: null,
        instance: null,
      }
    },
    template: `
        <transition name="mel-scrollbar-fade">
            <div
            v-show="always || visible"
            ref="instance"
            :class="['mel-scrollbar__bar', 'is-' + bar.key]"
            @mousedown="clickTrackHandler"
            >
            <div
                ref="thumb"
                class="mel-scrollbar__thumb"
                :style="thumbStyle"
                @mousedown="clickThumbHandler"
            ></div>
            </div>
        </transition>
        
        `,
    methods: {
      clickThumbHandler(e) {
        // prevent click event of middle and right button
        e.stopPropagation()
        if (e.ctrlKey || [1, 2].includes(e.button)) {
          return
        }
        window.getSelection().removeAllRanges()
        this.startDrag(e)
        this.barStore[this.bar.axis] =
          e.currentTarget[this.bar.offset] -
          (e[this.bar.client] -
            e.currentTarget.getBoundingClientRect()[
            this.bar.direction
            ])
      },

      clickTrackHandler(e) {
        const offset = Math.abs(
          e.target.getBoundingClientRect()[this.bar.direction] -
          e[this.bar.client]
        )
        const thumbHalf = this.thumb[this.bar.offset] / 2
        const thumbPositionPercentage =
          ((offset - thumbHalf) * 100 * this.offsetRatio) /
          this.instance[this.bar.offset]

        this.scrollbar.wrap[this.bar.scroll] =
          (thumbPositionPercentage * this.scrollbar.wrap[this.bar.scrollSize]) / 100
      },

      startDrag(e) {
        e.stopImmediatePropagation()
        this.cursorDown = true
        on(document, 'mousemove', this.mouseMoveDocumentHandler)
        on(document, 'mouseup', this.mouseUpDocumentHandler)
        this.onselectstartStore = document.onselectstart
        document.onselectstart = () => false
      },

      mouseUpDocumentHandler() {
        this.cursorDown = false
        this.barStore[this.bar.axis] = 0
        off(document, 'mousemove', this.mouseMoveDocumentHandler)
        off(document, 'mouseup', this.mouseUpDocumentHandler)
        document.onselectstart = this.onselectstartStore
        if (this.cursorLeave) {
          this.visible = false
        }
      },

      mouseMoveDocumentHandler(e) {
        if (this.cursorDown === false) return
        const prevPage = this.barStore[this.bar.axis]

        if (!prevPage) return

        const offset = (
          this.instance.getBoundingClientRect()[this.bar.direction]
          - e[this.bar.client]
        ) * -1;

        const thumbClickPosition = this.thumb[this.bar.offset] - prevPage
        const thumbPositionPercentage =
          ((offset - thumbClickPosition) * 100 * this.offsetRatio) /
          this.instance[this.bar.offset]
        this.scrollbar.wrap[this.bar.scroll] =
          (thumbPositionPercentage * this.scrollbar.wrap[this.bar.scrollSize]) / 100
      },

      mouseMoveScrollbarHandler() {
        this.cursorLeave = false
        this.visible = !!this.$props.size
      },

      mouseLeaveScrollbarHandler() {
        this.cursorLeave = true
        this.visible = this.cursorDown
      }
    },
    beforeCreate() {
      this.onselectstartStore = null;
    },
    computed: {
      offsetRatio() {
        // offsetRatioX = original width of thumb / current width of thumb / ratioX
        // offsetRatioY = original height of thumb / current height of thumb / ratioY
        // instance height = wrap height - GAP
        return (
          this.instance[this.bar.offset] ** 2 /
          this.scrollbar.wrap[this.bar.scrollSize] /
          this.$props.ratio /
          this.thumb[this.bar.offset]
        )
      },

      thumbStyle() {
        return renderThumbStyle({
          size: this.$props.size,
          move: this.$props.move,
          bar: this.bar,
        })
      },
      bar() {
        return BAR_MAP[this.$props.vertical ? 'vertical' : 'horizontal']
      }
    },

    mounted() {
      this.instance = this.$refs["instance"]
      this.thumb = this.$refs["thumb"]
      this.$nextTick(() => {
        on(this.scrollbar.scrollbar, 'mousemove', this.mouseMoveScrollbarHandler)
        on(this.scrollbar.scrollbar, 'mouseleave', this.mouseLeaveScrollbarHandler)
      })
    },

    beforeUnmount() {
      off(document, 'mouseup', this.mouseUpDocumentHandler)
      off(this.scrollbar.scrollbar, 'mousemove', this.mouseMoveScrollbarHandler)
      off(this.scrollbar.scrollbar, 'mouseleave', this.mouseLeaveScrollbarHandler)
    }
  }

  const scrollbar = {
    components: { bar },

    provide() {
      return {
        'scrollbar': this,
      }
    },

    props: {
      height: { type: [String, Number], default: '', },
      maxHeight: {
        type: [String, Number], default: '',
      },
      native: { type: Boolean, default: false, },
      wrapStyle: { type: [String, Array], default: '', },
      wrapClass: { type: [String, Array], default: '', },
      viewClass: { type: [String, Array], default: '', },
      viewStyle: { type: [String, Array], default: '', },
      noresize: Boolean, // 如果 container 尺寸不会发生变化，最好设置它可以优化性能
      tag: { type: String, default: 'div', },
      always: { type: Boolean, default: false, },
      minSize: { type: Number, default: 20, },
    },
    data() {
      return {
        sizeWidth: '0',
        sizeHeight: '0',
        moveX: 0,
        moveY: 0,
        scrollbar: null,
        wrap: null,
        resize: null,
        ratioY: 1,
        ratioX: 1,
      }
    },
    computed: {
      go() {
        return this.resize || 100
      },
      renderWrapStyle() {
        let style = this.wrapStyle
        if (isArray(style)) {
          style = toObject(style)
          style.height = addUnit(this.height)
          style.maxHeight = addUnit(this.$props.maxHeight)
        } else if (isString(style)) {
          style += addUnit(this.height)
            ? `height: ${addUnit(this.height)};`
            : ''
          style += addUnit(this.maxHeight)
            ? `max-height: ${addUnit(this.maxHeight)};`
            : ''
        }
        return style
      }
    },
    mounted() {
      this.wrap = this.$refs["wrap"];
      this.resize = this.$refs["resize"];
      this.scrollbar = this.$refs['scrollbar'];

      if (!this.$props.native) {
        this.$nextTick(this.update)
      }

      if (!this.$props.noresize) {
        addResizeListener(this.resize, this.update)
        addEventListener('resize', this.update)
      }
    },
    beforeUnmount() {
      if (!this.$props.noresize) {
        removeResizeListener(this.resize, this.update)
        removeEventListener('resize', this.update)
      }
    },
    template: `
        <div ref="scrollbar" class="mel-scrollbar">
          <div
            ref="wrap"
            :class="[
              wrapClass,
              'mel-scrollbar__wrap',
              native ? '' : 'mel-scrollbar__wrap--hidden-default',
            ]"
            :style="renderWrapStyle"
            @scroll="handleScroll"
          >
            <component
              :is="tag"
              ref="resize"
              :class="['mel-scrollbar__view', viewClass]"
              :style="viewStyle"
            >
              <slot></slot>
            </component>
          </div>
          <template v-if="!native">
            <bar :move="moveX" :ratio="ratioX" :size="sizeWidth" :always="always" />
            <bar
              :move="moveY"
              :ratio="ratioY"
              :size="sizeHeight"
              vertical
              :always="always"
            />
          </template>
        </div>
        `,
    methods: {
      handleScroll() {
        if (this.wrap) {
          const offsetHeight = this.wrap.offsetHeight - GAP
          const offsetWidth = this.wrap.offsetWidth - GAP

          this.moveY =
            ((this.wrap.scrollTop * 100) / offsetHeight) * this.ratioY
          this.moveX =
            ((this.wrap.scrollLeft * 100) / offsetWidth) * this.ratioX

          this.$emit('scroll', {
            scrollTop: this.wrap.scrollTop,
            scrollLeft: this.wrap.scrollLeft,
          })
        }
      },


      setScrollTop(value) {
        if (!isNumber(value)) {
          debugWarn(SCOPE, 'value must be a number')
          return
        }
        this.wrap.scrollTop = value
      },

      setScrollLeft(value) {
        if (!isNumber(value)) {
          debugWarn(SCOPE, 'value must be a number')
          return
        }
        this.wrap.scrollLeft = value
      },

      update() {
        if (!this.wrap) return

        const offsetHeight = this.wrap.offsetHeight - GAP
        const offsetWidth = this.wrap.offsetWidth - GAP

        const originalHeight = offsetHeight ** 2 / this.wrap.scrollHeight
        const originalWidth = offsetWidth ** 2 / this.wrap.scrollWidth
        const height = Math.max(originalHeight, this.$props.minSize)
        const width = Math.max(originalWidth, this.$props.minSize)

        this.ratioY =
          originalHeight /
          (offsetHeight - originalHeight) /
          (height / (offsetHeight - height))
        this.ratioX =
          originalWidth /
          (offsetWidth - originalWidth) /
          (width / (offsetWidth - width))

        this.sizeHeight = height + GAP < offsetHeight ? height + 'px' : ''
        this.sizeWidth = width + GAP < offsetWidth ? width + 'px' : ''
      }
    }
  }

  return scrollbar;
}));