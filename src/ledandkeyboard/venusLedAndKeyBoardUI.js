class LedAndKeyBoard {

	/**
	 *
	 * @param {element} svg The svg
	 */
	constructor() {
	    this.BUTTON_ON_COLOR = "#DDDDDD";
	    this.BUTTON_OFF_COLOR = "#735348";
	    this.BUTTON_ON_OPACITY = "1";
	    this.BUTTON_OFF_OPACITY = "1";


		this.LED_ON_COLOR = "#FF0000";
	    this.LED_ON_OPACITY = "1";
	    this.LED_OFF_COLOR = "#800000";
	    this.LED_OFF_OPACITY = "1";

	    this.SEGMENT_ON_COLOR = "#FF0000";
	    this.SEGMENT_ON_OPACITY = "1";
	    this.SEGMENT_OFF_COLOR = "#400000";
	    this.SEGMENT_OFF_OPACITY = "1";

		// Get UI Elements 
		this.leds = Array(8);
		for(let i = 0; i < 8; i++) {
			this.leds[i] = document.getElementById("led" + i);
		}

		this.segments = Array(64);
		for(let disp=0;disp < 8; disp++) {
			for(let seg=0;seg < 8; seg++) {
				this.segments[disp * 8 + seg] = document.getElementById("disp" + disp + seg);
			}
		}

		this.buttons = Array(8);
		for(let i = 0; i < 8; i++) {
			this.buttons[i] = document.getElementById("button" + i);
			this.buttons[i].setAttribute("onmousedown", "vscode.postMessage({command: 'button_pressed', which: " + i + "})");
			// Set an event handler that will trigger when the mouse is released or moves away
			this.buttons[i].setAttribute("onmouseup", "vscode.postMessage({command: 'button_released', which: " + i + "})");
			this.buttons[i].setAttribute("onmouseleave", "vscode.postMessage({command: 'button_released', which: " + i + "})");
		}

		this.rgbLEDInner = document.getElementById("rgbLEDInner");
		this.rgbLEDOuter = document.getElementById("rgbLEDOuter");
	}

	drawFromState(uiState) {
		// Convert UIState into object 
		for(let i = 0; i < 8; i++) {
			let fill = this.LED_OFF_COLOR;
			let opacity = this.LED_OFF_OPACITY;
			if(uiState.led_value & (1 << i)) {
				fill = this.LED_ON_COLOR;
				opacity = this.LED_ON_OPACITY;
			} 
			this.leds[i].setAttribute("fill", fill);
			this.leds[i].setAttribute("fill-opacity", opacity);
		}

		for(let disp=0;disp < 8; disp++) {
			for(let seg=0;seg < 8; seg++) {
				let fill = this.SEGMENT_OFF_COLOR;
				let opacity = this.SEGMENT_OFF_OPACITY;
				let bit = 0;
				if(disp<4) {
					bit = uiState.disp03_value & (1 << (disp * 8 + seg));
				} else {
					bit = uiState.disp47_value & (1 << ((disp - 4) * 8 + seg));
				}
				if(bit) {
					fill = this.SEGMENT_ON_COLOR;
					opacity = this.SEGMENT_ON_OPACITY;
				}
				this.segments[disp * 8 + seg].setAttribute("fill", fill);
				this.segments[disp * 8 + seg].setAttribute("fill-opacity", opacity);
			}
		}

		for(let i = 0; i < 8; i++) {
			let fill = this.BUTTON_OFF_COLOR;
			let opacity = this.BUTTON_OFF_OPACITY;
			if(uiState.button_value & (1 << i)) {
				fill = this.BUTTON_ON_COLOR;
				opacity = this.BUTTON_ON_OPACITY;
			}
			this.buttons[i].setAttribute("fill", fill);
			this.buttons[i].setAttribute("fill-opacity", opacity);
		}

		// Set this.rgbLED color from uistate.rgbled_value
		this.rgbLEDInner.setAttribute("fill", `rgb(${(uiState.rgbled_value >> 16) & 0xFF}, ${(uiState.rgbled_value >> 8) & 0xFF}, ${uiState.rgbled_value & 0xFF})`);
		// Make opacity relative to the brightness of RGB values
		let r = (uiState.rgbled_value >> 16) & 0xFF;
		let g = (uiState.rgbled_value >> 8) & 0xFF;
		let b = uiState.rgbled_value & 0xFF;
		let brightness = Math.max(r,g,b, Math.sqrt(r * r + g * g + b * b));
		let opacity = Math.min(1.0, brightness / 200); // 256 is the maximum brightness (255 * 3)
		this.rgbLEDInner.setAttribute("fill-opacity", opacity.toString());
		// this.rgbLED.setAttribute("fill-opacity", "1");
		// Set the rgbLEDOuter color to the same as the inner, but with a lower opacity
		this.rgbLEDOuter.setAttribute("fill", `rgb(${(uiState.rgbled_value >> 16) & 0xFF}, ${(uiState.rgbled_value >> 8) & 0xFF}, ${uiState.rgbled_value & 0xFF})`);
		this.rgbLEDOuter.setAttribute("fill-opacity", (opacity * 0.7).toString());
		// Set a blur on the outer too
		this.rgbLEDOuter.setAttribute("filter", "url(#blurFilter)"); 
	}
}

const vscode = acquireVsCodeApi();
var board = new LedAndKeyBoard();

// Handle the message inside the webview
window.addEventListener('message', event => {
	const message = event.data; // The JSON data our extension sent

	switch (message.command) {
		case 'loadState':
			let state = message.uiState;
			board.drawFromState(state);
			break;
	}
});

