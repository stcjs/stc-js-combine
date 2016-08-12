import Plugin from 'stc-plugin';

const REG = {
    COMMENTS: /("([^\\\"]*(\\.)?)*")|('([^\\\']*(\\.)?)*')|(\/{2,}.*?(\r|\n))|(\/\*(\n|.)*?\*\/)/g,
    DOCUMENT_WRITE: /document\.write.*?srcPath.*?['"](.*?)['"]/g,
    SCRIPT_NAME: /srcPath.*?['"](.*?)['"]/,
    SRCPATH: /var\s+srcPath\s*=\s*("|')(.*?)\1/
};

const FILESTREE = 'filesTree';

export default class JSCombinePlugin extends Plugin {
    log() {
        return;
    }
    async getContentFormCache(filePath) {
        let filesTree = await this.cache(FILESTREE);
        filesTree = filesTree || {};
        let arr = [];
        function combine(p) {
            if (filesTree[p]) {
                filesTree[p].forEach((v) => {
                    combine(v);
                });
            } else {
                if (arr.indexOf(p) === -1){
                    arr.push(p);
                }
            }
        }
        combine(filePath);
        let content = [];
        let promise = arr.map(async (v) =>{
            let cache = await this.cache(v);
            if (cache) {
                content.push(cache);
            }
        });
        await Promise.all(promise);
        content = content.join(';');
        await this.cache(filePath, content);
        return content;
    }
    /**
     * run
     */
    async run(){
        let stcFilePath = this.file.path;
        if (stcFilePath.indexOf('/') !== 0) {
            stcFilePath = '/' + stcFilePath;
        }
        this.log('enter ------------------------>');
        //如果有缓存，直接返回
        let content = await this.cache(stcFilePath);
        if (content) {
            return content;
        }
        content = await this.getContent('utf8');
        //去掉注释
        content = content.replace(REG.COMMENTS, (word) =>{
            return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? '' : word;
        });
        //获取公共路径
        let srcPathRes = REG.SRCPATH.exec(content);
        if (!srcPathRes || !srcPathRes[2]) {
            return content;
        }
        let srcPath = srcPathRes[2];
        this.log('commen path: ', srcPath);
        //获取document.write script
        let scripts = content.match(REG.DOCUMENT_WRITE);
        if (!scripts || !scripts.length) {
            return content;
        }
        //获取script路径
        let scriptPathes = [];
        scripts.forEach((str) => {
            let res = REG.SCRIPT_NAME.exec(str);
            if (res && res[1]){
                let jsPath = srcPath + res[1];
                if (scriptPathes.indexOf(jsPath) === -1) {
                    scriptPathes.push(jsPath);
                }
            }
        });
        if (!scriptPathes.length) {
            return content;
        }
        //缓存文件关系
        let filesTree = await this.cache(FILESTREE);
        filesTree = filesTree || {};
        if (!filesTree[stcFilePath]){
            filesTree[stcFilePath] = scriptPathes;
            await this.cache(FILESTREE, filesTree);
        }
        this.log('scripts: ', scriptPathes);
        //获取文件内容并缓存
        let promise = scriptPathes.map(async (filePath) => {
            let fileContent = await this.cache(filePath);
            if (fileContent) {
                return;
            }
            let stcFile = await this.getFileByPath(filePath);
            fileContent = await this.invokeSelf(stcFile);
            await this.cache(filePath, fileContent);
        });
        await Promise.all(promise);
        content = await this.getContentFormCache(stcFilePath);
        return content;
    }

    /**
     * update
     */
    update(str){
        str = str.trimRight();
        if (str.charAt(str.length - 1) !== ';') {
            str += ';';
        }
        this.log('content: ', str, '<--------end');
        this.setContent(str);
    }
    /**
     * default include
     */
    static include(){
        return /\.js$/;
    }

    /**
     * use cluster
     */
    static cluster(){
        return false;
    }

    /**
     * use cache
     */
    static cache(){
        return false;
    }
}
