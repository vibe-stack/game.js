export const configureMonaco = (monacoInstance: any) => {
  // Configure TypeScript compiler options
  monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monacoInstance.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });

  // Configure diagnostics options
  monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Add common type definitions
  const gameJSTypes = `
    declare interface Vector3 {
      x: number;
      y: number;
      z: number;
    }

    declare interface Transform {
      position: Vector3;
      rotation: Vector3;
      scale: Vector3;
    }

    declare interface GameObject {
      id: string;
      name: string;
      transform: Transform;
      getComponent<T>(type: string): T | null;
      addComponent<T>(type: string, properties?: any): T;
      removeComponent(type: string): void;
    }

    declare interface Scene {
      findObjectByName(name: string): GameObject | null;
      findObjectById(id: string): GameObject | null;
      createObject(name: string): GameObject;
      destroyObject(id: string): void;
    }

    declare const scene: Scene;
    declare const gameObject: GameObject;
    declare const transform: Transform;
  `;

  monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
    gameJSTypes,
    'file:///node_modules/@types/gamejs/index.d.ts'
  );

  // Define custom theme
  monacoInstance.editor.defineTheme('gamejs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d30',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
    },
  });

  monacoInstance.editor.defineTheme('gamejs-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' },
      { token: 'class', foreground: '267F99' },
      { token: 'function', foreground: '795E26' },
      { token: 'variable', foreground: '001080' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#f0f0f0',
      'editor.selectionBackground': '#add6ff',
      'editor.inactiveSelectionBackground': '#e5ebf1',
    },
  });
}; 