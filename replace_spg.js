const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content
                .replace(/SPG Facturación/g, 'Win o Win Facturación')
                .replace(/Facturación SPG/g, 'Win o Win Facturación')
                .replace(/Sistema de Facturación SPG/g, 'Sistema de Facturación Win o Win')
                .replace(/no-reply@spg\.com/g, 'no-reply@winowin.com');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}
replaceInDir(path.join(__dirname, 'src'));
replaceInDir(path.join(__dirname, 'public'));
