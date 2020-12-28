import { ConsoleLogger, DefaultActiveSpeakerPolicy, DefaultDeviceController, DefaultMeetingSession, DefaultVideoTransformDevice, LogLevel, MeetingSessionConfiguration, VideoTransformDevice } from "amazon-chime-sdk-js"
import { createRef, useEffect, useState } from "react"
import { joinMeeting } from "../api/api"
import { VirtualBackground } from "../frameProcessors/VirtualBackground"
import AudioVideoObserver from "../observers/AudioVideoObserver"
import { DeviceChangeObserverImpl } from "../observers/DeviceChangeObserverImpl"
import { activeSpeakerDetectorSubscriber, attendeeIdPresenceSubscriber } from "../observers/subscriber"
import { DefaultVideoTransformDeviceObserverImpl } from "../observers/TransformObserver"

interface AppInfo{
    title?:string
    userName?:string
    meetingInfo?:any
    meetingSession?: DefaultMeetingSession
    transformDevice?: DefaultVideoTransformDevice
    vbg?: VirtualBackground
}


export const Chime = () => {
    const [appInfo, setAppInfo] = useState({}as AppInfo)
    const titleRef = createRef<HTMLInputElement>()
    const usernameRef = createRef<HTMLInputElement>()
    const fileInputRef = createRef<HTMLInputElement>()
    const bgFileInputRef = createRef<HTMLInputElement>()
    const videoElementRef = createRef<HTMLVideoElement>()

    const join = () => {
        appInfo['title'] = titleRef.current!.value
        appInfo['userName'] = usernameRef.current!.value
        joinMeeting(appInfo['title'], appInfo['userName']).then(meetingInfo => {
            console.log(meetingInfo)
            appInfo['meetingInfo'] = meetingInfo
            const logger = new ConsoleLogger('MeetingLogs', LogLevel.OFF);
            const deviceController = new DefaultDeviceController(logger);
            const deviceChangeObserver = new DeviceChangeObserverImpl()
            deviceController.addDeviceChangeObserver(deviceChangeObserver)
            const configuration = new MeetingSessionConfiguration(meetingInfo.JoinInfo.Meeting, meetingInfo.JoinInfo.Attendee)
            const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
            appInfo['meetingSession'] = meetingSession
    
            const audioVideoOserver = new AudioVideoObserver(meetingSession.audioVideo, [
                document.getElementById("tile1") as HTMLVideoElement,
                document.getElementById("tile2") as HTMLVideoElement,
                document.getElementById("tile3") as HTMLVideoElement,
                document.getElementById("tile4") as HTMLVideoElement,
            ])
            meetingSession.audioVideo.addObserver(audioVideoOserver)
            meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(attendeeIdPresenceSubscriber)
            meetingSession.audioVideo.subscribeToActiveSpeakerDetector(
                new DefaultActiveSpeakerPolicy(),
                activeSpeakerDetectorSubscriber,
                scores => {
                  //console.log("subscribeToActiveSpeakerDetector", scores)
                },100
            )
            const inputAudioPromise  = meetingSession.audioVideo.listAudioInputDevices()
            const inputVideoPromise  = meetingSession.audioVideo.listVideoInputDevices()
            const outputAudioPromise = meetingSession.audioVideo.listAudioOutputDevices()

            Promise.all([inputAudioPromise, inputVideoPromise, outputAudioPromise]).then(
                ([inputAudioList, inputVideoList, outputAudioList])=>{
                  console.log("Devices:::",inputAudioList, inputVideoList, outputAudioList)
    
                  const p1 = meetingSession.audioVideo.chooseAudioInputDevice(inputAudioList[0].deviceId)
                  const p2 = meetingSession.audioVideo.chooseAudioOutputDevice(outputAudioList[0].deviceId)
                  const vbg = new VirtualBackground()
                  const transformDevice = new DefaultVideoTransformDevice(
                    logger,
                    inputVideoList[0].deviceId, 
                    [vbg]
                  );
                  appInfo['transformDevice'] = transformDevice
                  appInfo['vbg'] = vbg                  
                  transformDevice.addObserver(new DefaultVideoTransformDeviceObserverImpl())
                  const p3 = meetingSession.audioVideo.chooseVideoInputDevice(transformDevice as VideoTransformDevice)
    
                  Promise.all([p1,p2,p3]).then(()=>{
                    const audioOutputElement = document.getElementById('audio-output') as HTMLAudioElement;              
                    meetingSession.audioVideo.bindAudioElement(audioOutputElement);
                    meetingSession.audioVideo.start()
                    meetingSession.audioVideo.startLocalVideoTile()
                    setAppInfo(appInfo)
                  })
                }
              )
        })
    }

    const setBG = (path:string, fileType:string) => {
        if(fileType.startsWith("image")){
            appInfo['vbg']!.setBG(path)
        }else{
            console.log("not supported filetype", fileType)
        }
    }

    const setMovie = (path:string, fileType:string) => {
        if(fileType.startsWith("video")){
            videoElementRef.current!.pause()
            videoElementRef.current!.srcObject = null
            videoElementRef.current!.src = path
            videoElementRef.current!.currentTime=0
            videoElementRef.current!.autoplay = true
            videoElementRef.current!.play()

            videoElementRef.current!.onloadedmetadata = (e) =>{
                // @ts-ignore
                const mediaStream = videoElementRef.current!.captureStream() as MediaStream
                appInfo['transformDevice'] = appInfo['transformDevice']!.chooseNewInnerDevice(mediaStream)
                appInfo['meetingSession']!.audioVideo.chooseVideoInputDevice(appInfo['transformDevice']  as VideoTransformDevice).then(()=>{
                    appInfo['meetingSession']!.audioVideo.startLocalVideoTile()
                })
            }
        }else{
            console.log("not supported filetype", fileType)
        }
    }

    const setCamera = () => {
        console.log("setMovie1")
        appInfo['meetingSession']!.audioVideo.listVideoInputDevices().then(res=>{
            appInfo['transformDevice'] = appInfo['transformDevice']!.chooseNewInnerDevice(res[0])
            
            appInfo['meetingSession']!.audioVideo.chooseVideoInputDevice(appInfo['transformDevice']  as VideoTransformDevice).then(()=>{
                appInfo['meetingSession']!.audioVideo.startLocalVideoTile()
            })

        })
        console.log("setMovie3",appInfo['transformDevice']!,appInfo['meetingSession']!)
        
    }
    return (
        <div>
            meeting title: <input ref={titleRef} type="text" placeholder="meeting title" value="meeting1" />
            username : <input ref={usernameRef} type="text" placeholder="user name" value="user1" />
            <button type="button" onClick={(e) => join()}>
                join meeting
            </button>
            <button type="button" onClick={(e) => fileInputRef.current!.click()}>
                movie
            </button>
            <button type="button" onClick={(e) => setCamera()}>
                camera
            </button>
            <button type="button" onClick={(e) => bgFileInputRef.current!.click()}>
                background
            </button>

            <input type="file" hidden ref={fileInputRef} onChange={(e: any) => {
                    const path = URL.createObjectURL(e.target.files[0]);
                    const fileType = e.target.files[0].type
                    console.log("file",path,fileType)
                    setMovie(path, fileType)
            }} />
            <input type="file" hidden ref={bgFileInputRef} onChange={(e: any) => {
                    const path = URL.createObjectURL(e.target.files[0]);
                    const fileType = e.target.files[0].type
                    console.log("file",path,fileType)
                    setBG(path, fileType)
            }} />
            <video ref={videoElementRef} loop hidden />
            <audio id="audio-output" hidden></audio>
            <div id="video-container">
                <video id="tile1" width="640px" height="480px"/>
                <video id="tile2" width="640px" height="480px"/>
                <video id="tile3" width="640px" height="480px"/>
                <video id="tile4" width="640px" height="480px"/>
            </div>
        </div>
    )
}