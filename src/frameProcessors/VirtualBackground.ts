import { CanvasVideoFrameBuffer, VideoFrameBuffer, VideoFrameProcessor } from "amazon-chime-sdk-js";
import { BodypixWorkerManager, generateBodyPixDefaultConfig, generateDefaultBodyPixParams, SemanticPersonSegmentation } from "@dannadori/bodypix-worker-js"

interface VirtualBackgroundConfig{
    frontPositionX:number, // ratio (position and size of front image)
    frontPositionY:number, // ratio (position and size of front image)
    frontWidth: number,    // ratio (position and size of front image)
    frontHeight: number,   // ratio (position and size of front image)
 
    width:number,          // pixel (output size. If =<0, fit the background canvas size )
    height:number,         // pixel (output size. If =<0, fit the background canvas size )
}


export class VirtualBackground implements VideoFrameProcessor{
    canvasFront = document.createElement('canvas')
    canvasFrontResized = document.createElement("canvas")
    canvasBackground = document.createElement("canvas")
    private defaultConfig:VirtualBackgroundConfig={
        frontPositionX:0, // ratio (position and size of front image)
        frontPositionY:0, // ratio (position and size of front image)
        frontWidth:1,     // ratio (position and size of front image)
        frontHeight:1,    // ratio (position and size of front image)
        width:-1,         // pixel (output size. If =<0, fit the background canvas size )
        height:-1,        // pixel (output size. If =<0, fit the background canvas size )
    }

    targetCanvas = document.createElement('canvas')
    targetCanvasCtx = this.targetCanvas!.getContext('2d')
    canvasVideoFrameBuffer = new CanvasVideoFrameBuffer(this.targetCanvas!);
    manager = new BodypixWorkerManager()
    config = generateBodyPixDefaultConfig()
    params = (()=>{
        const p = generateDefaultBodyPixParams()  
        p.processWidth=640
        p.processHeight=480
        return p
    })()
    sourceWidth  = 0;
    sourceHeight = 0;
    constructor(){
        this.manager.init(this.config)
        const bg = new Image();
        bg.src="/bg1.jpg"
        bg.onload = ()=>{
            this.canvasBackground.getContext("2d")!.drawImage(bg, 0, 0, this.canvasBackground.width, this.canvasBackground.height)
        }
    }

    setBG(path:string){
        const bg = new Image();
        bg.src=path
        bg.onload = ()=>{
            this.canvasBackground.getContext("2d")!.drawImage(bg, 0, 0, this.canvasBackground.width, this.canvasBackground.height)
        }
    }

    async destroy(){
        this.targetCanvasCtx = null;
        this.canvasVideoFrameBuffer.destroy();
        return;
    }

    async process(buffers: VideoFrameBuffer[]){
        console.log("process!")
        if(buffers.length == 0){
            return Promise.resolve(buffers);
        }
        // @ts-ignore
        const canvas = buffers[0].asCanvasElement()
        const frameWidth = canvas!.width;
        const frameHeight = canvas!.height;
        if (frameWidth === 0 || frameHeight === 0) {
            return Promise.resolve(buffers);
        }

        for(const f of buffers){
            try{
                // @ts-ignore
                const canvas = f.asCanvasElement()
                const result = await this.manager.predict(canvas as HTMLCanvasElement, this.params)
                this.convert(canvas as HTMLCanvasElement, this.canvasBackground, result)
            }catch(err){
                console.log("Exception:: ",err)
            }
        }
        buffers[0] = this.canvasVideoFrameBuffer;
        return Promise.resolve(buffers)
      
    }

    convert = (foreground:HTMLCanvasElement, background:HTMLCanvasElement, 
        bodypixResult:SemanticPersonSegmentation, conf:VirtualBackgroundConfig=Object.assign({},this.defaultConfig))=>{

        // (1) resize output canvas and draw background
        if(conf.width <=0 || conf.height<=0){
            conf.width = foreground.width > background.width ? foreground.width : background.width
            conf.height = foreground.height > background.height ? foreground.height : background.height
        }

        this.targetCanvas.width  = conf.width
        this.targetCanvas.height = conf.height
        this.targetCanvas.getContext("2d")!.drawImage(background, 0, 0, conf.width, conf.height)
        if(bodypixResult == null){ // Depends on timing, bodypixResult is null
            return this.targetCanvas
        }

        // (2) generate foreground transparent
        this.canvasFront.width  = bodypixResult.width
        this.canvasFront.height = bodypixResult.height
        const frontCtx=this.canvasFront.getContext("2d")!
        frontCtx.drawImage(foreground, 0, 0, bodypixResult.width, bodypixResult.height)
        const pixelData = new Uint8ClampedArray(bodypixResult.width * bodypixResult.height * 4)

        for (let rowIndex = 0; rowIndex < bodypixResult.height; rowIndex++){
            for(let colIndex = 0; colIndex < bodypixResult.width; colIndex++){
                const seg_offset = ((rowIndex * bodypixResult.width) + colIndex)
                const pix_offset = ((rowIndex * bodypixResult.width) + colIndex) * 4
                if(bodypixResult.data[seg_offset] === 0 ){
                    pixelData[pix_offset]     = 0
                    pixelData[pix_offset + 1] = 0
                    pixelData[pix_offset + 2] = 0
                    pixelData[pix_offset + 3] = 0
                }else{
                    pixelData[pix_offset]     = 255
                    pixelData[pix_offset + 1] = 255
                    pixelData[pix_offset + 2] = 255
                    pixelData[pix_offset + 3] = 255
                }
            }
        }
        const fgImageDataTransparent = new ImageData(pixelData, bodypixResult.width, bodypixResult.height);
        frontCtx.putImageData(fgImageDataTransparent, 0, 0)

        this.canvasFrontResized.width = foreground.width
        this.canvasFrontResized.height = foreground.height
        this.canvasFrontResized.getContext("2d")!.drawImage(this.canvasFront, 0, 0, this.canvasFrontResized.width, this.canvasFrontResized.height)
        this.canvasFrontResized.getContext("2d")!.globalCompositeOperation = 'source-in';
        this.canvasFrontResized.getContext("2d")!.drawImage(foreground, 0, 0, this.canvasFrontResized.width, this.canvasFrontResized.height)

        // (3) merge Front into Bacground
        const frontPositionX = conf.width  * conf.frontPositionX
        const frontPositionY = conf.height * conf.frontPositionY
        const frontWidth     = conf.width  * conf.frontWidth
        const frontHeight    = conf.height * conf.frontHeight
        this.targetCanvas.getContext("2d")!.drawImage(this.canvasFrontResized, frontPositionX, frontPositionY, 
            frontWidth, frontHeight)
    }

}