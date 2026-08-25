/* ============================================================
 * 沙漠之歌工作台 · 无 Spherse 环境降级层
 * ------------------------------------------------------------
 * 在 Spherse App 内：保存走原生 spherse.data.set（真实写文件）
 * 在纯网页（Gitee/GitHub Pages 等静态托管）：
 *   - 编辑保存在浏览器 localStorage
 *   - 支持一键导出 / 导入 JSON，搬运回电脑后放回 forum/ 即可同步
 * 用法：各页面 <head> 引入本脚本后调用 window.SMQ.*
 * ============================================================ */
window.SMQ = (function () {
    var KEY = 'smq_standalone_v1';
    var pageExport = null; // { file, filename, get } 由页面注册，用于「导出本页」

    function isNative() {
        return !!(window.spherse && window.spherse.data && window.spherse.data.set);
    }

    function loadAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
    }

    function saveAll(all) {
        try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
    }

    /* 保存数据：file 为数据文件路径（如 'forum/角色档案库.data.json'），key 为其中字段 */
    async function save(file, key, value) {
        if (isNative()) {
            await spherse.data.set({ file: file, key: key, value: value });
            return { mode: 'native' };
        }
        var all = loadAll();
        if (!all[file] || typeof all[file] !== 'object') all[file] = {};
        all[file][key] = value;
        saveAll(all);
        return { mode: 'local' };
    }

    /* 读取本地编辑的数据（无则返回 undefined，应回退到服务器数据） */
    function getLocal(file, key) {
        var all = loadAll();
        var f = all[file];
        return f ? f[key] : undefined;
    }

    /* 导出全部本地数据为 JSON 文件 */
    function exportAll() {
        var all = loadAll();
        var payload = {
            app: '沙漠之歌工作台',
            note: '将 files 内的内容按文件名放回项目 forum/ 目录即可同步到电脑',
            exportedAt: new Date().toISOString(),
            files: all
        };
        downloadObject('沙漠之歌-数据导出-' + new Date().toISOString().slice(0, 10) + '.json', payload);
    }

    /* 直接下载一个对象为 JSON 文件（文件名可含中文，GitHub 支持） */
    function downloadObject(filename, obj) {
        var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    /* 页面注册「导出本页」：导出当前页面数据文件（已含本地编辑），可直接覆盖上传仓库 */
    function registerPageExport(file, filename, get) {
        pageExport = { file: file, filename: filename, get: get };
    }

    /* 从 JSON 文件导入数据到 localStorage（兼容导出格式 / 裸 files 对象） */
    async function importAll(fileInput) {
        var f = fileInput && fileInput.files && fileInput.files[0];
        if (!f) return { ok: false, msg: '未选择文件' };
        var text = await f.text();
        try {
            var data = JSON.parse(text);
            var files = data && data.files ? data.files : data;
            if (!files || typeof files !== 'object') return { ok: false, msg: '文件内容不是有效数据' };
            var all = loadAll();
            Object.keys(files).forEach(function (file) {
                if (typeof files[file] === 'object' && files[file] !== null) all[file] = files[file];
            });
            saveAll(all);
            return { ok: true, msg: '导入成功，刷新页面即可看到本地数据' };
        } catch (e) {
            return { ok: false, msg: '文件格式不正确' };
        }
    }

    /* 简单提示（复用页面已有 toast 则忽略） */
    function toast(msg) {
        var t = document.getElementById('smqToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'smqToast';
            t.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%) translateY(20px);z-index:9999;background:var(--surface,#1a1e27);border:1px solid var(--line,rgba(201,169,106,.25));color:var(--text-primary,#ede4d4);padding:10px 18px;border-radius:6px;font-size:13px;letter-spacing:.05em;box-shadow:0 8px 30px rgba(0,0,0,.5);opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;max-width:80vw;text-align:center;';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        requestAnimationFrame(function () {
            t.style.opacity = '1';
            t.style.transform = 'translateX(-50%) translateY(0)';
        });
        clearTimeout(t._timer);
        t._timer = setTimeout(function () {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2600);
    }

    /* 渲染「导出 / 导入」按钮，返回工具函数 */
    function mountDataTools(container) {
        if (!container) return;
        var wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-flex;gap:8px;align-items:center;';
        var exp = document.createElement('button');
        exp.type = 'button';
        exp.textContent = '⇩ 导出数据';
        exp.title = '导出本地编辑的数据（JSON）';
        exp.style.cssText = 'background:none;border:1px solid var(--line,rgba(201,169,106,.3));color:var(--gold-mid,#a88955);border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;letter-spacing:.08em;font-family:inherit;transition:all .3s;';
        exp.addEventListener('mouseenter', function () { exp.style.color = 'var(--gold-bright,#e8d5a4)'; exp.style.borderColor = 'var(--gold,#c9a96a)'; });
        exp.addEventListener('mouseleave', function () { exp.style.color = 'var(--gold-mid,#a88955)'; exp.style.borderColor = 'var(--line,rgba(201,169,106,.3))'; });
        exp.addEventListener('click', function () {
            SMQ.exportAll();
            SMQ.toast('已导出 JSON 文件');
        });

        var imp = document.createElement('button');
        imp.type = 'button';
        imp.textContent = '⇧ 导入数据';
        imp.title = '从 JSON 文件导入数据到浏览器本地';
        imp.style.cssText = exp.style.cssText;
        imp.addEventListener('mouseenter', function () { imp.style.color = 'var(--gold-bright,#e8d5a4)'; imp.style.borderColor = 'var(--gold,#c9a96a)'; });
        imp.addEventListener('mouseleave', function () { imp.style.color = 'var(--gold-mid,#a88955)'; imp.style.borderColor = 'var(--line,rgba(201,169,106,.3))'; });
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', async function () {
            var res = await SMQ.importAll(fileInput);
            SMQ.toast(res.msg);
            fileInput.value = '';
            if (res.ok) setTimeout(function () { location.reload(); }, 800);
        });
        imp.addEventListener('click', function () { fileInput.click(); });
        document.body.appendChild(fileInput);

        wrap.appendChild(exp);

        /* 本页数据导出：可直接覆盖上传仓库对应 data.json */
        if (pageExport) {
            var pageExp = document.createElement('button');
            pageExp.type = 'button';
            pageExp.textContent = '⇩ 导出本页';
            pageExp.title = '导出本页数据文件（' + pageExport.filename + '），可在仓库中覆盖上传更新';
            pageExp.style.cssText = exp.style.cssText;
            pageExp.addEventListener('mouseenter', function () { pageExp.style.color = 'var(--gold-bright,#e8d5a4)'; pageExp.style.borderColor = 'var(--gold,#c9a96a)'; });
            pageExp.addEventListener('mouseleave', function () { pageExp.style.color = 'var(--gold-mid,#a88955)'; pageExp.style.borderColor = 'var(--line,rgba(201,169,106,.3))'; });
            pageExp.addEventListener('click', function () {
                downloadObject(pageExport.filename, pageExport.get());
                SMQ.toast('已导出 ' + pageExport.filename + '，上传覆盖到仓库 forum/ 即可更新');
            });
            wrap.appendChild(pageExp);
        }

        wrap.appendChild(imp);
        container.appendChild(wrap);
        return { exportAll: SMQ.exportAll, importAll: SMQ.importAll };
    }

    return {
        isNative: isNative,
        save: save,
        getLocal: getLocal,
        exportAll: exportAll,
        importAll: importAll,
        registerPageExport: registerPageExport,
        downloadObject: downloadObject,
        mountDataTools: mountDataTools,
        toast: toast
    };
})();

/* 自动挂载：页面只需放置 <span class="data-tools"></span> 即出现导出/导入按钮 */
(function autoMount() {
    function mount() {
        var c = document.querySelector('.data-tools');
        if (c) SMQ.mountDataTools(c);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
