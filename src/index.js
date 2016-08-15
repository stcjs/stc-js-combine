import Plugin from 'stc-plugin';

const REG = {
    DOCUMENT_WRITE: /\s*document\.write.*srcPath[^'\"]+['\"]([^'\"]*\.js)['\"].*/g,
    SCRIPT_NAME: /srcPath.*?['"](.*?)['"]/,
    SRCPATH: /var\s+srcPath\s*\=\s*([\'\"])([\w\-\/\.]+)\1/
};

let dependencies = {};
let cache = {};

export default class JSCombinePlugin extends Plugin {
  /**
   * check dependence
   */
  checkDependence(parentFile, file, add = false){
    if(!parentFile){
      return false;
    }
    let combinedFiles = dependencies[parentFile];
    if(!Array.isArray(combinedFiles)){
      dependencies[parentFile] = [];
      if(add){
        dependencies[parentFile].push(file);
      }
      return false;
    }
    if(combinedFiles.indexOf(file) > -1){
      return true;
    }
    for(let i = 0, length = combinedFiles.length; i < length; i++){
      let item = combinedFiles[i];
      if(this.checkDependence(item, file, false)){
        return true;
      }
    }
    return false;
  }
  /**
   * run
   */
  async run(){
    let parentFile = this.prop('parentFile');
    let times = parseInt(this.prop('times')) || 1;
    let filepath = this.file.path;
    if(times > 20){
      this.fatal(`${filepath} recursion more than 20 times`);
    }
    let oriContent = await this.getContent('utf8') + ';';
    if(this.checkDependence(parentFile, filepath, true) && oriContent.indexOf(filepath) > -1){
      return '';
    }
    if(cache[filepath]){
      return cache[filepath];
    }
    if(parentFile === './'){
      parentFile = '';
    }
    let out = oriContent.match(REG.DOCUMENT_WRITE);
    if(out){
      let matches = oriContent.match(REG.SRCPATH);
      let srcPath = matches[2];
      let content = '', len = out.length, flag = false;
      for(let i = 0; i < len; i++){
        let scriptName = out[i].match(REG.SCRIPT_NAME);
        let item = srcPath + scriptName[1];
        let pos = oriContent.indexOf(out[i]);
        if(pos === -1){
          content += out[i];
          continue;
        }
        let substring = oriContent.substring(0, pos + 1);
        let inlineCommentPos = substring.lastIndexOf('//');
        if(inlineCommentPos > -1){
          let s = substring.substr(inlineCommentPos);
          //如果//到document.write之间没有换行符，则document.write在单行注释里
          if(s.indexOf('\n') === -1 && s.indexOf('\r') === -1){
            continue;
          }
        }
        let pos1 = substring.indexOf('/*');
        let pos2 = substring.indexOf('*/');
        //如果/*的位置在*/之后，表明当前的document.write在注释中
        if(pos1 > -1){
          if(pos2 === -1 || pos1 > pos2){
            continue;
          }
        }
        content += content ? '\n' : '';
        content += `/**import from \`${item}\` **/\n`;
        content += await this.invokeSelf(item, {
          parentFile: filepath,
          times: times + 1
        });
        content += '\n';
        flag = true;
      }
      let ret = flag ? content : oriContent;
      cache[filepath] = content;
      return ret;
    }
    cache[filepath] = oriContent;
    return oriContent;
  }

  /**
   * update
   */
  update(str){
    str = str.trimRight();
    if (str.charAt(str.length - 1) !== ';') {
      str += ';';
    }
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
