import Plugin from 'stc-plugin';

const REG = {
    COMMENTS: /((^|[^"':\s])\/\/.*$)|((^|[^"':\s])\/\*(.|\s)*?\*\/)/g,
    DOCUMENT_WRITE: /document\.write.*?srcPath.*?['"](.*?)['"].*?<\/script>/g,
    SRCPATH: /var\s+srcPath\s*=\s*("|')(.*?)\1/
};
const HANDLEDRFILES = 'handledFiles';


console.log(Plugin.prototype.cache);
for(var key in Plugin.prototype) {
    console.log(key);

}

export default class JSCombinePlugin extends Plugin {
    /**
     * run
     */
    async run(){
        // console.log(this.constructor.name, this.getContent, this.getAst);
        // console.log(this.cache);
         return;
        let content, pathPreRes, pathPre, scipts, newFileContent = [], curHandledFiles = {}, handledFiles = await this.cache(HANDLEDRFILES);
        content = await this.getContent('utf8');
        //去掉注释
        content = content.replace(REG.COMMENTS, '');
        //得到公共路径
        pathPreRes = REG.SRCPATH.exec(content);
        if (pathPreRes || !pathPreRes[2]) {
            pathPre = pathPre[2] + '/';
            scripts = content.match(REG.DOCUMENT_WRITE);
            if (scripts && scripts.length) {
                let promise = scripts.map(async (str) => {
                    let filePath,  fileContent, fileName, res;
                    res = REG.DOCUMENT_WRITE.exec(str);
                    if (!res || !res[1]){
                        return;
                    }
                    fileName = res[1];
                    filePath = pathPre + fileName;
                    if (!curHandledFiles[filePath]) {
                        if (handledFiles[filePath]) {
                            newFileContent.push(handledFiles[filePath]);
                            curHandledFiles[filePath] = true;
                        } else {
                            fileContent = await this.invokeSelf(this.getFileByPath(filePath));
                            newFileContent.push(fileContent);
                            handledFiles[filePath] =  fileContent;
                            curHandledFiles[filePath] = true;
                            this.cache(HANDLEDRFILES, handledFiles);
                        }
                    }
                });
                await Promise.all(promise);
            }
        }
        return newFileContent.length ? newFileContent.join(';') : content;
    }

    /**
     * update
     */
    update(str){

        //this.setContent(str);
    }

    /**
     * use cluster
     */
    static cluster(){
        return true;
    }

    /**
     * use cache
     */
    static cache(){
        return true;
    }
}
