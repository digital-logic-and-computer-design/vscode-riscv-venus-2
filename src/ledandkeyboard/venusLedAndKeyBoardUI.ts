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

	public static settings(settings: any) {
		if( VenusLedAndKeyBoardUI) {
			// Merge in any settings 
			if (VenusLedAndKeyBoardUI._uiState) {
				VenusLedAndKeyBoardUI._uiState.settings = Object.assign({}, VenusLedAndKeyBoardUI._uiState.settings, settings);
			} 
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

		const svgPathOnDisk = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/board.svg');
		html = html.replace('${svgSource}', fs.readFileSync(svgPathOnDisk.fsPath).toString());

		const upduinoPathOnDisk = vscode.Uri.joinPath(VenusLedAndKeyBoardUI._extensionUri, '/src/ledandkeyboard/UPduino.svg');
		html = html.replace('${upduinoSource}', fs.readFileSync(upduinoPathOnDisk.fsPath).toString());

		return html;
	}

	public ecall(id: number, params: any) : object {
		// 150 = set LED, 151 = get LED, 152 = set disp03, 153 = get disp03, 154 = set disp47, 155 = get disp47, 156 = get keys/buttons
		var result = {};
		if (id == 0x150) {
			VenusLedAndKeyBoardUI._uiState.led_value = params.a1 & 0xFF;
		} else if (id == 0x151) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.led_value & 0xFF };
		} else if (id == 0x152) {
			VenusLedAndKeyBoardUI._uiState.disp03_value = params.a1 & 0xFFFFFFFF;
		} else if (id == 0x153) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.disp03_value & 0xFFFFFFFF};
		} else if (id == 0x154) {
			VenusLedAndKeyBoardUI._uiState.disp47_value = params.a1 & 0xFFFFFFFF;
		} else if (id == 0x155) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.disp47_value & 0xFFFFFFFF};
		} else if (id == 0x156) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.button_value & 0xFF };
		} else if (id == 0x160) {
			VenusLedAndKeyBoardUI._uiState.rgbled_value = params.a1 & 0xFFFFFF;
		}  else if (id == 0x161) {
			result = { "a0": VenusLedAndKeyBoardUI._uiState.rgbled_value & 0xFFFFFF };
		}
		this._update();
		return result;
	}
}
export class UIState {
	public led_value : number;
	public button_value : number;
	public disp03_value : number;
	public disp47_value : number;
	public rgbled_value : number;
	public settings: any;

	constructor(){
		this.reset();
		// Set default settings (CHECK: This should come from package.json, right?)
		this.settings = {
			"hideBoard": false,
			"hideRGB": false,
			"hideUART": false,
			"baudRate": 9600,
			"clocksPerInst": 4,
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
	}
}
