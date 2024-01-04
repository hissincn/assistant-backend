const OSS = require("ali-oss");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const config = require("../config.json");

import FC_Open20210406, * as $FC_Open20210406 from "@alicloud/fc-open20210406";
import OpenApi, * as $OpenApi from "@alicloud/openapi-client";
import Util, * as $Util from "@alicloud/tea-util";

const client = new OSS({
  region: config.s3.region,
  bucket: config.s3.bucket,
  accessKeyId: config.s3.accessKeyId,
  accessKeySecret: config.s3.accessKeySecret,
});

// Define the root directory path
const rootDir = path.resolve(__dirname, "../");
const zipPath = path.resolve(__dirname, "../dist/dist.zip");
const distDir = path.resolve(rootDir, "dist");

const upload = async () => {
  try {
    const result = await client.put("post/dist.zip", zipPath);
    if (result.res.status === 200) {
      console.log("上传成功 (=ﾟωﾟ)ﾉ");
      Client.main();
    }
  } catch (e) {
    console.log(e);
  }
};

const post = async () => {
  // Zip the "dist" directory without including the root folder
  const cmdStr = `cd ${distDir} && zip -r ${zipPath} ./*`;
  exec(cmdStr, async (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      process.exit(1); // Exit with an error code
    }
    console.log("打包成功 (=ﾟωﾟ)ﾉ");
    await upload();
  });
};

class Client {
  /**
   * 使用AK&SK初始化账号Client
   * @param accessKeyId
   * @param accessKeySecret
   * @return Client
   * @throws Exception
   */
  static createClient(accessKeyId, accessKeySecret) {
    let config = new $OpenApi.Config({
      // 必填，您的 AccessKey ID
      accessKeyId: accessKeyId,
      // 必填，您的 AccessKey Secret
      accessKeySecret: accessKeySecret,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/FC-Open
    config.endpoint = `1194569156519002.cn-shanghai.fc.aliyuncs.com`;
    return new FC_Open20210406(config);
  }

  static async main() {
    // 请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET。
    // 工程代码泄露可能会导致 AccessKey 泄露，并威胁账号下所有资源的安全性。以下代码示例使用环境变量获取 AccessKey 的方式进行调用，仅供参考，建议使用更安全的 STS 方式，更多鉴权访问方式请参见：https://help.aliyun.com/document_detail/378664.html
    let client = Client.createClient(
      config.s3.accessKeyId,
      config.s3.accessKeySecret
    );
    let updateFunctionHeaders = new $FC_Open20210406.UpdateFunctionHeaders({});
    let code = new $FC_Open20210406.Code({
      ossBucketName: "xiaoxin-assistant",
      ossObjectName: "post/dist.zip"
    });
    let updateFunctionRequest = new $FC_Open20210406.UpdateFunctionRequest({
      code: code,
    });
    let runtime = new $Util.RuntimeOptions({});
    try {
      // 复制代码运行请自行打印 API 的返回值
      await client.updateFunctionWithOptions(
        "Xiaoxin",
        "WebApi",
        updateFunctionRequest,
        updateFunctionHeaders,
        runtime
      );
      console.log("部署成功 (=ﾟωﾟ)ﾉ");
    } catch (error) {
      // 错误 message
      console.log(error.message);
      // 诊断地址
      console.log(error.data["Recommend"]);
      Util.assertAsString(error.message);
    }
  }
}

post();
