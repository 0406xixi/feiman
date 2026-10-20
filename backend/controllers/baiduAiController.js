// controllers/baiduAiController.js
const AipSpeechClient = require('baidu-aip-sdk').speech;

const APP_ID = process.env.BAIDU_APP_ID;
const API_KEY = process.env.BAIDU_API_KEY;
const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 检查配置
if (!APP_ID || !API_KEY || !SECRET_KEY) {
  console.error('❌ 百度AI凭证未配置，请检查 .env 文件');
}

// 创建百度语音客户端
const client = new AipSpeechClient(APP_ID, API_KEY, SECRET_KEY);

exports.transcribeAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No audio file uploaded.' });
  }

  // req.file.buffer 是 multer 处理后的音频二进制数据
  const audioBuffer = req.file.buffer;

  try {
    // 调用百度短语音识别
    // 参数：音频buffer, 格式, 采样率, 选项
    const result = await client.recognize(audioBuffer, 'wav', 16000, {
      dev_pid: 1537,  // 1537 = 普通话（纯中文识别）
    });

    console.log('百度ASR返回:', result);

    if (result.err_no === 0) {
      // 成功，result.result 是一个数组
      res.json({ result: result.result[0] });
    } else {
      res.status(500).json({
        msg: '百度ASR服务错误',
        error: result,
      });
    }
  } catch (error) {
    console.error('调用百度ASR API出错:', error);
    res.status(500).send('转录过程中服务器错误');
  }
};