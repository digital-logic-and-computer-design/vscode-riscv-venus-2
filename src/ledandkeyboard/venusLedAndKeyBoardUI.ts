import * as vscode from 'vscode'
import fs from 'fs'

/**
 * Manages cat coding webview panels
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


	public static getInstance(): VenusLedAndKeyBoardUI {
		if (VenusLedAndKeyBoardUI.instance) {
			return VenusLedAndKeyBoardUI.instance
		} else {
			VenusLedAndKeyBoardUI.instance = new VenusLedAndKeyBoardUI(undefined, VenusLedAndKeyBoardUI._uiState)
			return VenusLedAndKeyBoardUI.instance
		}
	}

	/** Closes the old instance if available and opens a new one */
	public static createNewInstance(extensionUri: vscode.Uri, uiState?: UIState): VenusLedAndKeyBoardUI {
		if (VenusLedAndKeyBoardUI.instance) {
			VenusLedAndKeyBoardUI.instance.dispose();
		}
		VenusLedAndKeyBoardUI.instance = new VenusLedAndKeyBoardUI(extensionUri, uiState)
		return VenusLedAndKeyBoardUI.instance
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
		VenusLedAndKeyBoardUI._uiState.reset()
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
						VenusLedAndKeyBoardUI._uiState.setButtonPressed(message.which)
						this._update()
						return;
				}
			},
			null,
			this._disposables
		);
	}

	private _update() {
		this._panel.webview.postMessage({command: "loadState", uiState: VenusLedAndKeyBoardUI._uiState})
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

		return html;
	}

	public ecall(id: number, params: any) : object {
		var result = {}
		if (id == 0x120) {
			VenusLedAndKeyBoardUI._uiState.setSegments(params.a1, params.a2)
		} else if (id == 0x121) {
			VenusLedAndKeyBoardUI._uiState.setLed(params.a1)
		} else if (id == 0x122) {
			var pressed : number = 0
			if (VenusLedAndKeyBoardUI._uiState.getAndResetButtonPressed(0))
				pressed |= 1
			if (VenusLedAndKeyBoardUI._uiState.getAndResetButtonPressed(1))
				pressed |= 2
			result = { "a0": pressed }
		}

		this._update()
		return result
	}
}

export class UIState {
	private led : boolean[]
	private sevenSegment0 : boolean[]
	private sevenSegment1 : boolean[]
	private buttonPressed : boolean[]

	constructor(){
		this.reset();
	}

	setLed(values: number) {
		this.led[0] = (values & 0x1) == 0x1
		this.led[1] = (values & 0x2) == 0x2
	}

	setSegments(values: number, mask: number) {
		for (let i = 0; i < 8; i++) {
			let seg0 = (values >> i) & 0x1
			let seg0_mask = (mask >> i) & 0x1
			let seg1 = (values >> (i+8)) & 0x1
			let seg1_mask = (mask >> (i+8)) & 0x1

			this.sevenSegment0[i] = ((seg0 & seg0_mask) == 1)
			this.sevenSegment1[i] = ((seg1 & seg1_mask) == 1)
		}
	}

	setButtonPressed(value: number) {
		this.buttonPressed[value] = true;
	}

	getAndResetButtonPressed(value: number) : boolean {
		var pressed : boolean = this.buttonPressed[value]
		this.buttonPressed[value] = false
		return pressed
	}

	reset() {
		this.led = Array<boolean>(2).fill(false)
		this.sevenSegment0 = Array<boolean>(8).fill(false)
		this.sevenSegment1 = Array<boolean>(8).fill(false)
		this.buttonPressed = Array<boolean>(2).fill(false)
	}

}
