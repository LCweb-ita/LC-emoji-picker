/**
 * lc_emoji_picker.js - Fancy emoji picker for text inputs and textareas
 * Version: 1.0.1
 * Author: Luca Montanari aka LCweb
 * Website: https://lcweb.it
 * Licensed under the MIT license
 */


(function() { 
	"use strict";
      
    /*** vars ***/
    let emoji_json      = null;
    let style_generated = null;
    let active_trigger  = null;
    let cat_waypoints   = {};
    
    const category_icons = {
        "smileys--people" : "😀", 
        "animals--nature" : "🐇",
        "travel--places"  : "🚘",
        "activities"      : "⚽",
        "objects"         : "🎧",
        "symbols"         : "🈶",
        "flags"           : "🚩",
    };
    
    const def_opts = {
        picker_trigger : 
        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" xml:space="preserve"><g><g><path d="M437.02,74.98C388.667,26.629,324.38,0,256,0S123.333,26.629,74.98,74.98C26.629,123.333,0,187.62,0,256s26.629,132.668,74.98,181.02C123.333,485.371,187.62,512,256,512s132.667-26.629,181.02-74.98C485.371,388.668,512,324.38,512,256S485.371,123.333,437.02,74.98z M256,472c-119.103,0-216-96.897-216-216S136.897,40,256,40s216,96.897,216,216S375.103,472,256,472z"/></g></g><g><g><path d="M368.993,285.776c-0.072,0.214-7.298,21.626-25.02,42.393C321.419,354.599,292.628,368,258.4,368c-34.475,0-64.195-13.561-88.333-40.303c-18.92-20.962-27.272-42.54-27.33-42.691l-37.475,13.99c0.42,1.122,10.533,27.792,34.013,54.273C171.022,389.074,212.215,408,258.4,408c46.412,0,86.904-19.076,117.099-55.166c22.318-26.675,31.165-53.55,31.531-54.681L368.993,285.776z"/></g></g><g><g><circle cx="168" cy="180.12" r="32"/></g></g><g><g><circle cx="344" cy="180.12" r="32"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>', // (string) html code injected as picker trigger  
        
        trigger_position    : { // (object) defies trigger position relatively to target field
            top : '5px',
            right: '5px',
        },
        target_r_padding    : 27, // (int) right padding value (in pixels) applied to target field to avoid texts under the trigger
        emoji_json_url      : 'https://raw.githubusercontent.com/LCweb-ita/LC-emoji-picker/master/emoji-list.min.json', // (string) emoji JSON url
        selection_callback  : null, // function(emoji, target_field) {}, - triggered as soon as an emoji is selected. Passes emoji and target field objects as parameters
    };
    
    
    
    
    
    /*** hide picker cicking outside ***/
    document.addEventListener('click', function(e) {
        const picker = document.querySelector("#lc-emoji-picker.lcep-shown");
        if(!picker || e.target.classList.contains('lcep-trigger')) {
            return true;    
        }
        
        // is an element within a trigger?
        for (const trigger of document.getElementsByClassName('lcep-trigger')) {
            if(trigger.contains(e.target)) {
                return true; 
            }    
        }
        
        // close if clicked elementis not in the picker
        if(!picker.contains(e.target) && !e.target.classList.contains('lcep-shown')) {
            picker.classList.remove('lcep-shown');
            active_trigger = null;
        }
        return true;
    });
    
    
    /* hide picker on screen resizing */
    window.addEventListener('resize', function(e) {
        const picker = document.querySelector("#lc-emoji-picker.lcep-shown");
        if(!picker) {
            return true;    
        }
        
        // close if clicked elementis not in the picker
        picker.classList.remove('lcep-shown');
        active_trigger = null;
        
        return true;
    });
    
    
    
    
   
    
    /*** plugin class ***/
    window.lc_emoji_picker = function(attachTo, options = {}) {
    
        this.attachTo = attachTo;
        if(!this.attachTo) {
            return console.error('You must provide object as a first argument')
        }
    
    
        // override options
        if(typeof(options) !=  'object') {
            return console.error('Options must be an object');    
        }
        options = Object.assign({}, def_opts, options);
        
    
        
        /* initialize */
        this.init = function() {
            const $this = this;
            
            // Generate style
            if(!style_generated) {
                this.generate_style();
                style_generated = true;
            }

            // load emoji json data on page loaded - stop plugin execution until it is loaded
            if(!emoji_json) {
                emoji_json = true; // avoid multiple calls
                document.addEventListener("DOMContentLoaded", this.fetch_emoji_data());
                return true;
            }
            
            
            // assign to each target element
            const targeted_el = document.querySelectorAll(attachTo);
            targeted_el.forEach(function(el) {
                if(
                    (el.tagName != 'TEXTAREA' && el.tagName != 'INPUT') ||
                    (el.tagName == 'INPUT' && el.getAttribute('type') != 'text')
                ) {
                    return;    
                }
  
                $this.append_emoji_picker();
                $this.wrap_element(el);
                
                document.querySelector('.lcep-search input').addEventListener("keyup", (e) => {
                    $this.emoji_search(e)    
                });
            });
        };
    
        
        
        /* emoji search - e = event */
        this.emoji_search = function(e) {
            const parent    = e.target.parentNode,
                  val       = e.target.value,
                  emojis    = document.querySelectorAll('#lc-emoji-picker .lcep-all-categories li');
            
            if(val.length < 2) {
                for (const emoji of emojis) {        
                    emoji.style.display = '';   
                    parent.classList.remove('lcep-searching');
                }
            }
            else {
                for (const emoji of emojis) {        
                    emoji.style.display = (emoji.getAttribute('data-name').match(val)) ? '' : 'none';    
                }   
                parent.classList.add('lcep-searching');
            }  
        };
        
        
        
        /* clear emoji search */
        this.clear_search = function() {
            const input = document.querySelector('.lcep-search input');

            input.value = '';
            input.dispatchEvent(new Event('keyup'));
        };

        
        
        /* go to emoji category by clicking btn */
        this.go_to_emoji_cat = function(el, cat_id) {
            const top_pos = document.querySelector(".lcep-category[category-name='"+ cat_id +"']").offsetTop;
            document.querySelector('.lcep-all-categories').scrollTop = top_pos - 90;
            
            document.querySelector("li.lcep-active").classList.remove('lcep-active');
            el.classList.add('lcep-active');
        };
        
        
        
        /* select emoji cat on emojis scroll */
        this.cat_waypoints_check = function() {
            const top_scroll = document.querySelector('.lcep-all-categories').scrollTop,
                  keys = Object.keys(cat_waypoints);
            
            keys.sort().reverse();
            
            let active = keys[0];
            for(const val of keys) {
                if(top_scroll >= parseInt(val, 10)) {
                    active = val;
                    break;
                }
            }
            
            const cat_id = cat_waypoints[active];

            document.querySelector("li.lcep-active").classList.remove('lcep-active');
            document.querySelector(".lcep-categories li[data-index='"+ cat_id +"']").classList.add('lcep-active');
        };
        
        
        
        /* reset picker: clear search and scrollers */
        this.reset_picker = function() {
            document.querySelector('.lcep-search i').click();
            document.querySelector('.lcep-categories li').click();
        };
        
        
        
        /* show picker */
        this.show_picker = function(trigger) {
            const picker = document.getElementById('lc-emoji-picker');

            if(trigger == active_trigger) {
                picker.classList.remove('lcep-shown');
                active_trigger = null;
                return false;
            }

            this.reset_picker();
            active_trigger = trigger;
                         
            const   picker_w    = picker.offsetWidth,
                    at_offsety  = active_trigger.getBoundingClientRect(),
                    at_h        = parseInt(active_trigger.clientHeight, 10),
                    y_pos       = (parseInt(at_offsety.y, 10) + parseInt(window.pageYOffset, 10) + at_h + 5);

            // left pos control - also checking side overflows
            let left = (parseInt(at_offsety.right, 10) - picker_w);
            if(left < 0) {
                left = 0;
            }
            
            picker.setAttribute('style', 'top: '+ y_pos +'px; left: '+ left +'px;');
            picker.classList.add('lcep-shown');
        };
        
        
        
        /* select emoji and insert it in the field */
        this.emoji_select = function(emoji) {
            const field = active_trigger.parentNode.querySelector('input, textarea');
            field.value = field.value + emoji.innerText;
            
            if(typeof(options.selection_callback) == 'function') {
                options.selection_callback.call(this, emoji, field);    
            }
        };
        
        
        
        /* wrap target element to allow trigger display */
        this.wrap_element = function(el) {
            const uniqid = Math.random().toString(36).substr(2, 9);
            
            let trigger_css = '';
            Object.keys( options.trigger_position ).some(function(name) {
                trigger_css += name +':'+ options.trigger_position[name] +';';     
            });
            
            let div = document.createElement('div');
            div.innerHTML = 
                '<span id="'+ uniqid +'" class="lcep-trigger" style="'+ trigger_css +'" title="insert emoji">'+ 
                options.picker_trigger +'</span>' + el.outerHTML;
            
            div.getElementsByTagName( el.tagName )[0].value = el.value; // keep values that might have been changed before init
            div.classList.add("lcep-el-wrap");

            el.parentNode.insertBefore(div, el);
            el.remove();
            
            // event to show picker
            const trigger = document.getElementById(uniqid);
            trigger.addEventListener("click", (e) => {this.show_picker(trigger)}); 
        };
        
        

        /* fetches emoji JSON data */
        this.fetch_emoji_data = function() {
            fetch(options.emoji_json_url)
                .then(response => response.json())
                .then(object => { 
                    emoji_json = object;
                    this.init();
                });
        };
    
        
        
        /* append emoji container picker to the body */
        this.append_emoji_picker = function() {
            if(document.getElementById("lc-emoji-picker")) {
                return true;    
            }
            
            let picker = `
            <div id="lc-emoji-picker">
                <div class="lcep-categories">%categories%
                    <div class="lcep-search">
                        <input placeholder="Search emoji" />
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512.005 512.005" xml:space="preserve"><g><g><path d="M505.749,475.587l-145.6-145.6c28.203-34.837,45.184-79.104,45.184-127.317c0-111.744-90.923-202.667-202.667-202.667S0,90.925,0,202.669s90.923,202.667,202.667,202.667c48.213,0,92.48-16.981,127.317-45.184l145.6,145.6c4.16,4.16,9.621,6.251,15.083,6.251s10.923-2.091,15.083-6.251C514.091,497.411,514.091,483.928,505.749,475.587z M202.667,362.669c-88.235,0-160-71.765-160-160s71.765-160,160-160s160,71.765,160,160S290.901,362.669,202.667,362.669z"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>
                        <i>×</i>
                    </div>
                </div>
                <div>%pickerContainer%</div>
            </div>`;

            let categories      = '<ul>%categories%</ul>';
            let categoriesInner = ``;
            let outerUl         = `<div class="lcep-all-categories">%outerUL%</div>`;
            let innerLists      = ``;

            let index = 0;

            // Loop through emoji object
            let object = emoji_json;

            for (const key in object) {
                if (object.hasOwnProperty(key)) {
                    
                    // Index count
                    index++;
                    let keyToId = key.split(' ').join('-').split('&').join('').toLowerCase();
 
                    const categories = object[key];
                    categoriesInner += `
                    <li class="${(index === 1) ? 'lcep-active' : ''}" data-index="${keyToId}" title="${key}">
                        <a href="javascript:void(0)">${category_icons[keyToId]}</a>
                    </li>`;

                    innerLists += `
                    <ul class="lcep-category" category-name="${keyToId}">
                        <div class="lcep-container-title">${key}</div>
                        <div class="lcep-grid">`;

                            // Loop through emoji items
                            categories.forEach(item => {
                                innerLists += `
                                <li data-name="${item.description.toLowerCase()}">
                                    <a class="lcep-item" title="${item.description}" data-name="${item.description.toLowerCase()}" data-code="${item.code}" href="javascript:void(0)">${item.emoji}</a>
                                </li>`;
                            });

                        innerLists += `
                        </div>
                    </ul>`;
                }
            }
            
            let allSmiles = outerUl.replace('%outerUL%', innerLists);
            let cats = categories.replace('%categories%', categoriesInner);

            picker = picker.replace('%pickerContainer%', allSmiles).replace('%categories%', cats);
            document.body.insertAdjacentHTML('beforeend', picker);
           
            
            // bind cat naviagation
            for (const cat of document.querySelectorAll('.lcep-categories li')) {
                cat.addEventListener("click", (e) => {
                    this.go_to_emoji_cat(cat, cat.getAttribute('data-index'));
                });    
            }
            
            // set save waypoints for scrolling detection
            for (const cat_tit of document.querySelectorAll('.lcep-container-title')) {
                cat_waypoints[ cat_tit.offsetTop - 101 ] = cat_tit.parentNode.getAttribute('category-name');
            }
            document.querySelector('.lcep-all-categories').addEventListener("scroll", () => {this.cat_waypoints_check()});
            
            // bind search
            document.querySelector('.lcep-search i').addEventListener("click", (e) => {this.clear_search()});
            
            // emoji selection
            for (const emoji of document.querySelectorAll('.lcep-all-categories li')) {
                emoji.addEventListener("click", (e) => {this.emoji_select(emoji)});
            }
        };
        
        
        
        /* creates inline CSS into the page */
        this.generate_style = function() {        
            document.head.insertAdjacentHTML('beforeend', `
                <style>
                .lcep-el-wrap {
                    position: relative;
                }
                .lcep-el-wrap > textarea,
                .lcep-el-wrap > input {
                    padding-right: ${options.target_r_padding}px;
                }
                .lcep-trigger {
                    display: inline-block;
                    position: absolute;
                    width: 22px;
                    height: 22px;
                    cursor: pointer;
                }
                .lcep-trigger svg {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    opacity: 0.8;
                    fill: #282828;
                    transition: all .15s ease;
                }
                .lcep-trigger svg:hover {
                    fill: #202020;
                }
                #lc-emoji-picker,
                #lc-emoji-picker * {
                    box-sizing: border-box;
                }
                #lc-emoji-picker {
                    visibility: hidden;
                    z-index: -100;
                    opacity: 0;
                    position: absolute;
                    top: -9999px;
                    z-index: 999;
                    width: 280px;
                    min-height: 320px;
                    background: #fff;
                    box-shadow: 0px 2px 13px -2px rgba(0, 0, 0, 0.18);
                    border-radius: 6px;
                    overflow: hidden;
                    border: 1px solid #ccc;
                    transform: scale(0.85);
                    transition: opacity .2s ease, transform .2s ease;
                }
                #lc-emoji-picker.lcep-shown {
                    visibility: visible;
                    z-index: 999;
                    transform: none;
                    opacity: 1;

                }
                #lc-emoji-picker .lcep-all-categories {
                    height: 260px;
                    overflow-y: auto;
                    padding: 0 5px 20px 10px;
                }
                #lc-emoji-picker .lcep-category:not(:first-child) {
                    margin-top: 22px;
                }
                #lc-emoji-picker .lcep-container-title {
                    color: black;
                    margin: 10px 0;
                    text-indent: 10px;
                    font-size: 13px;
                    font-weight: bold;
                }
                #lc-emoji-picker * {
                    margin: 0;
                    padding: 0;
                    text-decoration: none;
                    color: #666;
                    font-family: sans-serif;
                    user-select: none;
                    -webkit-tap-highlight-color:  rgba(255, 255, 255, 0); 
                }
                .lcep ul {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                .lcep-grid {
                    display: flex;
                    flex-wrap: wrap;
                }
                .lcep-grid > li {
                    cursor: pointer;
                    flex: 0 0 calc(100% / 6);
                    max-width: calc(100% / 6);
                    height: 41px;
                    min-width: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #fff;
                    border-radius: 2px;
                    transition: all .2s ease;
                }
                .lcep-grid > li:hover {
                    background: #99c9ef;
                }
                .lcep-grid > li > a {
                    display: block;
                    font-size: 21px;
                    margin: 0;
                    padding: 22px 0px;
                    line-height: 0;
                }
                .lcep-categories ul {
                    display: flex;
                    flex-wrap: wrap;
                    list-style: none;
                }
                .lcep-categories li {
                    transition: all .3s ease;
                    flex: 0 0 calc(100% / 7);
                    display: flex;
                    max-width: calc(100% / 7);
                }
                .lcep-categories li.lcep-active {
                    box-shadow: 0 -3px 0 #48a6f0 inset;
                }
                .lcep-categories a {
                    padding: 7px !important;
                    font-size: 19px;
                    height: 42px;
                    display: flex;
                    text-align: center;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    filter: grayscale(100%) contrast(150%);
                }
                .lcep-categories a:before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, .2);
                    cursor: pointer;
                    transition: background .25s ease;
                }
                .lcep-categories li:not(.lcep-active):hover a:before {
                    background: rgba(255, 255, 255, .4);
                }
                .lcep-search {
                    position: relative;
                    border-top: 1px solid #ddd;
                    padding: 10px 6px !important;
                }
                .lcep-search input {
                    width: 100%;
                    border: none;
                    padding: 8px 30px 8px 10px !important;
                    outline: none;
                    background: #fff;
                    font-size: 13px;
                    color: #616161;
                    border: 2px solid #ddd;
                    height: 30px;
                    border-radius: 25px; 
                    user-select: auto !important;
                }
                .lcep-search svg,
                .lcep-search i {
                    width: 14px;
                    height: 14px;
                    position: absolute;
                    right: 16px;
                    top: 18px;
                    fill: #444;
                    cursor: pointer;
                }
                .lcep-search i {
                    color: #444;
                    font-size: 22px;
                    font-family: arial;
                    line-height: 14px;
                    transition: opacity .15s ease;
                }
                .lcep-search i:hover {
                    opacity: .8;
                }
                .lcep-searching svg,
                .lcep-search:not(.lcep-searching) i {
                    display: none;
                }
                .lcep-footer {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    height: 50px;
                    padding: 0 15px 15px 15px;
                }
                .lcep-footer-icon {
                    font-size: 30px;
                    margin-right: 8px;
                }
            </style>`);
        };
        

        // init when called
        this.init();
    };
})();