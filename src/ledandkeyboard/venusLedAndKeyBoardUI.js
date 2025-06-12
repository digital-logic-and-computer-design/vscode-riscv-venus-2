class LedAndKeyBoard {

	/**
	 *
	 * @param {element} svg The svg
	 */
	constructor() {
	    this.LED_ON_COLOR = "#FF0000";
	    this.LED_ON_OPACITY = "1";
	    this.LED_OFF_COLOR = "#FF0000";
	    this.LED_OFF_OPACITY = "0.35";
	    this.BUTTON_ON_COLOR = "#DDDDDD";
	    this.BUTTON_OFF_COLOR = "#735348";
	    this.BUTTON_ON_OPACITY = "1";
	    this.BUTTON_OFF_OPACITY = "1";

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
				let fill = this.LED_OFF_COLOR;
				let opacity = this.LED_OFF_OPACITY;
				let bit = 0;
				if(disp<4) {
					bit = uiState.disp03_value & (1 << (disp * 8 + seg));
				} else {
					bit = uiState.disp47_value & (1 << ((disp - 4) * 8 + seg));
				}
				if(bit) {
					fill = this.LED_ON_COLOR;
					opacity = this.LED_ON_OPACITY;
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

