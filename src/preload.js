const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, data) => {
    let validChannels = [
      'check-setup', 'setup-auth', 'login',
      'request-password-recovery', 'verify-recovery-code', 'reset-password',
      'get-settings', 'save-settings', 'select-directory', 'open-directory',
      'get-profile', 'update-profile',
      'get-clientes', 'create-cliente', 'get-cliente-by-id', 'update-cliente', 'delete-cliente',
      'get-facturas', 'create-factura', 'get-factura-by-id', 'update-factura-estado', 'generate-factura-pdf', 'anular-factura',
      'sign-invoice-xades', 'validate-xades-signature', 'verify-invoice-integrity', 'select-certificate-file',
      'generate-enhanced-pdf', 'preview-pdf', 'save-pdf', 'print-pdf', 'generate-watermarked-pdf', 'get-available-logos', 'generate-batch-pdfs',
      'get-emisor-activo', 'get-all-emisores', 'get-emisor-by-id', 'create-emisor', 'update-emisor', 'delete-emisor', 'activate-emisor', 'get-siguiente-numero-factura', 'get-datos-fiscales-verifactu', 'get-opciones-formulario-emisor',
      'save-smtp-config', 'test-smtp-connection',
      'export-database', 'import-database',
      'get-series', 'create-serie',
      'get-audit-logs', 'verify-audit-integrity',
      'get-iva-summary', 'export-logs'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  send: (channel, data) => {
    let validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

