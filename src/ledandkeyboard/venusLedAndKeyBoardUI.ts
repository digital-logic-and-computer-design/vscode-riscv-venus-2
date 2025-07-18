import * as vscode from 'vscode';
import fs from 'fs';

/**
 * Manages LED & Key webview panels
 */
export class VenusLedAndKeyBoardUI {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static instance: VenusLedAndKeyBoardUI | undefined;

	public static readonly viewType = 'VenusLedAndKeyBoardUI';
	private _panel: vscode.WebviewPanel;
	private static _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private static _uiState: UIState;
	private static _stepsPerCharacter: number = 833; // Default steps per character, can be adjusted based on settings

	public static settings(settings: any) {
		if( VenusLedAndKeyBoardUI) {
			// Merge in any settings 
			if (VenusLedAndKeyBoardUI._uiState) {
				VenusLedAndKeyBoardUI._uiState.settings = Object.assign({}, VenusLedAndKeyBoardUI._uiState.settings, settings);
			} 
			// Compute "steps per character" (min 1) from settings (based on simulated I/O and use-cases, using concept of "character" rather than "byte")
			// Step = inst count
			let instsPerSecond = VenusLedAndKeyBoardUI._uiState.settings.clock / VenusLedAndKeyBoardUI._uiState.settings.clocksPerInst;
			let secondsPerCharacter = 8 / VenusLedAndKeyBoardUI._uiState.settings.baudRate;		
			VenusLedAndKeyBoardUI._stepsPerCharacter = Math.max(1, instsPerSecond * secondsPerCharacter);
		}
	}

	public static getInstance(): VenusLedAndKeyBoardUI {
		if (VenusLedAndKeyBoardUI.instance) {
			return VenusLedAndKeyBoardUI.instance;
		} else {
			VenusLedAndKeyBoardUI.instance = new VenusLedAndKeyBoardUI(undefined, VenusLedAndKeyBoardUI._uiState);
			return VenusLedAndKeyBoardUI.instance;
		}
	}

	/** Closes the old instance if available and opens a new one */
	public static createNewInstance(extensionUri: vscode.Uri, uiState?: UIState): VenusLedAndKeyBoardUI {
		if (VenusLedAndKeyBoardUI.instance) {
			VenusLedAndKeyBoardUI.instance.dispose();
		}
		VenusLedAndKeyBoardUI.instance = new VenusLedAndKeyBoardUI(extensionUri, uiState);
		return VenusLedAndKeyBoardUI.instance;
	}

	private constructor(extensionUri?: vscode.Uri, uiState?: UIState) {
		if (extensionUri) { 
			VenusLedAndKeyBoardUI._extensionUri = extensionUri;
		}	
		if (uiState) {
			VenusLedAndKeyBoardUI._uiState = uiState;
		} else {
			VenusLedAndKeyBoardUI._uiState = new UIState();
		}
	}

	public dispose() {
		VenusLedAndKeyBoardUI.instance = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public receiveStep(step: number) {
		console.log("VenusLedAndKeyBoardUI: receiveStep: " + step);

		// let stepsPerCharacter = Math.max(1, VenusLedAndKeyBoardUI._uiState.settings.clocksPerInst * VenusLedAndKeyBoardUI._uiState.settings.clock / VenusLedAndKeyBoardUI._uiState.settings.baudRate);
		let stepsToAccountFor = step - VenusLedAndKeyBoardUI._uiState.uartIncomingStartClock;
		while(stepsToAccountFor >= VenusLedAndKeyBoardUI._stepsPerCharacter) {
			// Slice off the first character from the incoming buffer
			if (VenusLedAndKeyBoardUI._uiState.incoming.length > 0) {
				VenusLedAndKeyBoardUI._uiState.incoming = VenusLedAndKeyBoardUI._uiState.incoming.slice(1);
				// Mark the front byte as processed (processed by the code / simulator)
				VenusLedAndKeyBoardUI._uiState.incomingProcessed = false;
				VenusLedAndKeyBoardUI._uiState.uartIncomingStartClock = step; // Reset the clock for incoming UART bytes
				// Update UI 
				this._update();
			} else {
				// No more characters to process
				VenusLedAndKeyBoardUI._uiState.uartIncomingStartClock = step;
				break;
			}
			// Decrease the steps to account for
			stepsToAccountFor -= VenusLedAndKeyBoardUI._stepsPerCharacter;
		}
		VenusLedAndKeyBoardUI._uiState.lastStep = step;
	}

	public show(column? : vscode.ViewColumn) {
		VenusLedAndKeyBoardUI._uiState.reset();
		// If we already have a panel, show it.
		if (VenusLedAndKeyBoardUI.instance?._panel) {
			VenusLedAndKeyBoardUI.instance._panel.reveal();
		} else {
			this._addPanel(column);
		}
	}

	private _addPanel(column? : vscode.ViewColumn) {

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			VenusLedAndKeyBoardUI.viewType,
			'Led and Key Board',
			column ? column : vscode.ViewColumn.Beside,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `ui` directory.
				localResourceRoots: [vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, 'src', 'ledandkeyboard')]
			}
		);

		this._panel = panel;

		// Set the webview's initial html content
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
					case 'button_pressed':
						VenusLedAndKeyBoardUI._uiState.setButtonPressed(message.which);
						this._update();
						return;
					case 'button_released':
						VenusLedAndKeyBoardUI._uiState.setButtonReleased(message.which);
						this._update();
						return;
					case 'send_uart':
						// Append bytes to the incoming buffer
						VenusLedAndKeyBoardUI._uiState.incoming += message.text;
						// If the length is now 1, set the processed state to false
						if (VenusLedAndKeyBoardUI._uiState.incoming.length == 1) {
							VenusLedAndKeyBoardUI._uiState.incomingProcessed = false;
							// Set the current character start time 
							VenusLedAndKeyBoardUI._uiState.uartIncomingStartClock = VenusLedAndKeyBoardUI._uiState.lastStep;
						}						
						this._update();
						return;
					case 'flush_uart':
						// Flush the outgoing buffer
						VenusLedAndKeyBoardUI._uiState.incoming = "";
						VenusLedAndKeyBoardUI._uiState.incomingProcessed = false; // Reset the processed state
						this._update();
						return;
					case 'clear_console':
						// One empty line
						VenusLedAndKeyBoardUI._uiState.consoleView = new Array("");
						VenusLedAndKeyBoardUI._uiState.dataView = new Array("");
						this._update();
						return;
				}
			},
			null,
			this._disposables
		);
	}

	private _update() {
		this._panel.webview.postMessage({command: "loadState", uiState: VenusLedAndKeyBoardUI._uiState});
	}

	private _getHtmlForWebview(webview: vscode.Webview, ) {

		const htmlPathOnDisk = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/venusLedAndKeyBoardUI.html');
		var htmlpath = htmlPathOnDisk.fsPath;
		var html = fs.readFileSync(htmlpath).toString();

		const onDiskPath = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/venusLedAndKeyBoardUI.js');
		const scriptSrc = webview.asWebviewUri(onDiskPath);
		html = html.replace('${scriptSrc}', scriptSrc.toString());

		const stylePath = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/venusLedAndKeyBoardUI.css');
		const styleSrc = webview.asWebviewUri(stylePath);
		html = html.replace('${styleSrc}', styleSrc.toString());

		const boardPathOnDisk = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/board.svg');
		html = html.replace('${boardSource}', fs.readFileSync(boardPathOnDisk.fsPath).toString());

		const upduinoPathOnDisk = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/UPduino.svg');
		html = html.replace('${upduinoSource}', fs.readFileSync(upduinoPathOnDisk.fsPath).toString());

		return html;
	}

	public ecall(id: number, params: any) : object {
		// 150 = set LED, 151 = get LED, 152 = set disp03, 153 = get disp03, 154 = set disp47, 155 = get disp47, 156 = get keys/buttons
		var result = {};
		if (id == 0x150) {
			VenusLedAndKeyBoardUI._uiState.led_value = params.a1 & 0xFF;
			this._update();
		} else if (id == 0x151) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.led_value & 0xFF };
			this._update();
		} else if (id == 0x152) {
			VenusLedAndKeyBoardUI._uiState.disp03_value = params.a1 & 0xFFFFFFFF;
			this._update();
		} else if (id == 0x153) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.disp03_value & 0xFFFFFFFF};
			this._update();
		} else if (id == 0x154) {
			VenusLedAndKeyBoardUI._uiState.disp47_value = params.a1 & 0xFFFFFFFF;
			this._update();
		} else if (id == 0x155) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.disp47_value & 0xFFFFFFFF};
			this._update();
		} else if (id == 0x156) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.button_value & 0xFF };
			this._update();
		} else if (id == 0x160) {
			VenusLedAndKeyBoardUI._uiState.rgbled_value = params.a1 & 0xFFFFFF;
			this._update();
		}  else if (id == 0x161) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.rgbled_value & 0xFFFFFF };
			this._update();
		} else if (id == 0x170) {
			// Send a byte to console
			this.processIncomingByte(params.a1 & 0xFF);
			this._update();
		} else if (id == 0x171) {
			// Try to retrieve a byte 
			if( VenusLedAndKeyBoardUI._uiState.incomingProcessed || VenusLedAndKeyBoardUI._uiState.incoming.length == 0) {
				// If the front byte has been processed, return 0
				result = { "a0": -1 };
			} else {
				// If the front byte has not been processed, return it
				result = { "a0": VenusLedAndKeyBoardUI._uiState.incoming.charCodeAt(0) };
				// Mark the front byte as processed (processed by the code / simulator)
				VenusLedAndKeyBoardUI._uiState.incomingProcessed = true;
			}
			this._update();
		}
		return result;
	}
	processIncomingByte(byte: number) {
		// Process an incoming byte
		// If it's a new line, add a new, initially blank line to the consoleView
		if (byte == 0x0A) { // New line
			// Push on a new line 
			VenusLedAndKeyBoardUI._uiState.consoleView.push("");
		} else {
			// If the last line is full, append and "line wrap" character and a new line
			let lastLine = VenusLedAndKeyBoardUI._uiState.consoleView.length - 1;
			if (VenusLedAndKeyBoardUI._uiState.consoleView[lastLine].length >= UIState.COLUMNS) {
				VenusLedAndKeyBoardUI._uiState.consoleView[lastLine] += "\u21A9";
				VenusLedAndKeyBoardUI._uiState.consoleView.push("");
				lastLine++;
			}
			// Append the byte to the last line
			VenusLedAndKeyBoardUI._uiState.consoleView[lastLine] += String.fromCharCode(byte);
		}
		// If the console view is too long, remove the first line
		if (VenusLedAndKeyBoardUI._uiState.consoleView.length > UIState.LINES) {
			VenusLedAndKeyBoardUI._uiState.consoleView.shift();
		}
		// Add the byte to the data view
		let dataLine = VenusLedAndKeyBoardUI._uiState.dataView.length - 1;
		if (VenusLedAndKeyBoardUI._uiState.dataView[dataLine].length >= UIState.COLUMNS) {
			VenusLedAndKeyBoardUI._uiState.dataView.push("");
			dataLine++;
		}
		// Append to current line in format "XX char "
		let char = String.fromCharCode(byte);
		// If the character is outside the printable ASCII range, use a dot
		if (char < ' ' || char > '~') {
			char = '\u{02592}'; // Unicode bullet character
		}
		VenusLedAndKeyBoardUI._uiState.dataView[dataLine] += (byte.toString(16).toUpperCase().padStart(2, '0') + "\u{21E2}" + char + " ");
		// If the data view is too long, remove the first line
		if (VenusLedAndKeyBoardUI._uiState.dataView.length > UIState.LINES) {
			VenusLedAndKeyBoardUI._uiState.dataView.shift();
		}

		if( VenusLedAndKeyBoardUI._uiState.incoming.length > 0) {
			// This will take the same time as an incoming byte.  If there's an incoming byte being processed, advance it
			if( VenusLedAndKeyBoardUI._uiState.incomingProcessed ) {
				// If the front byte has been processed, we can advance it
				VenusLedAndKeyBoardUI._uiState.incomingProcessed = false; // Reset the processed state			
				VenusLedAndKeyBoardUI._uiState.uartIncomingStartClock = VenusLedAndKeyBoardUI._uiState.lastStep; // Reset the clock for incoming UART bytes
			}
			VenusLedAndKeyBoardUI._uiState.incoming = VenusLedAndKeyBoardUI._uiState.incoming.slice(1);
		}

		// Update the webview with the new state		
		this._update();
	}
}
export class UIState {
	static LINES = 40; // Number of lines in the console
	static COLUMNS = 80; // Number of columns in the console
	public led_value : number;
	public button_value : number;
	public disp03_value : number;
	public disp47_value : number;
	public rgbled_value : number;
	public settings: any;

	// Array of outgoing bytes (ascii)
	public incoming: string = "";
	public incomingProcessed: boolean = false;  // Indicates if the front byte has been processed already
	// Array of incoming bytes (raw bytes)
	public consoleView : string[];
	public dataView : string[];
	public lastStep : number = 0; // Last step received from the simulator
	public uartIncomingStartClock : number = 0; // The clock when the first byte was received

	constructor() {
		this.reset();
		// Initialize the console and data views with one, empty line
		this.consoleView = new Array("");
		this.dataView = new Array("");
		// Set default settings (CHECK: This should come from package.json, right?)
		this.settings = {
			"hideBoard": false,
			"hideRGB": false,
			"hideUART": false,
			"baudRate": 57600,
			"clocksPerInst": 1,
			"clock": 6000000
		};
	}

	setButtonReleased(value: number) {
		this.button_value &= ~(1 << value);
	}

	setButtonPressed(value: number) {
		this.button_value |= (1 << value);
	}

	reset() {
		this.led_value = 0;
		this.disp03_value = 0;
		this.disp47_value = 0;
		this.button_value = 0;
		this.rgbled_value = 0;
		this.incoming = "";
		this.incomingProcessed = false;
		this.consoleView = new Array("");
		this.dataView = new Array("");
		this.lastStep = 0;
		this.uartIncomingStartClock = 0; // Reset the clock for incoming UART bytes
	}
}
