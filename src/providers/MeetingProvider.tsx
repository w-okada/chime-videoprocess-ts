import { ConsoleLogger, DefaultActiveSpeakerPolicy, DefaultDeviceController, DefaultMeetingSession, DefaultVideoTransformDevice, LogLevel, MeetingSessionConfiguration, VideoTileState, VideoTransformDevice } from 'amazon-chime-sdk-js';
import React, { useState, ReactNode, useContext, useEffect } from 'react';
import { DeviceChangeObserverImpl } from '../observers/DeviceChangeObserverImpl';
import * as api from '../api/api'
import AudioVideoObserverTemplate from '../observers/AudioVideoObserver';
import { activeSpeakerDetectorSubscriber, attendeeIdPresenceSubscriber } from '../observers/subscriber';
import { useAppState } from './AppStateProvider';
import { VirtualBackground, VirtualBackgroundType } from '../frameProcessors/VirtualBackground';
type Props = {
    children: ReactNode;
};



interface MeetingStateValue {
    meetingSession: DefaultMeetingSession | null
    joinMeeting: (meetingTitle: string, userName: string) => void
    newTileState: VideoTileState | null

    setVirtualBackgroundType: (val: VirtualBackgroundType) => void
    setVirtualBackgroundImageImage: (path: string) => void
}


const MeetingStateContext = React.createContext<MeetingStateValue | null>(null)


export const useMeetingState = (): MeetingStateValue => {
    const state = useContext(MeetingStateContext)
    if (!state) {
        throw new Error("Error using app state context!")
    }
    return state
}


export const MeetingStateProvider = ({ children }: Props) => {
    const { audioInput, videoInput, audioOutput} = useAppState()
    const [ meetingSession, setMeetingSession] = useState(null as DefaultMeetingSession | null)
    const [ newTileState, setNewTileState ] = useState(null as VideoTileState | null )

    //// Virtual Background
    const [ backgroundBlurLevelForVBG, setBackgroundBlurLevelForVBG] = useState(1)
    const [ virtualBackgroundProcessor, setVirtualBackgroundProcessor] = useState( null as VirtualBackground|null)
    if(virtualBackgroundProcessor === null){
        setVirtualBackgroundProcessor(new VirtualBackground())
    }

    useEffect(()=>{
        console.log("change video input!",videoInput)
        if(meetingSession){
            meetingSession.audioVideo.stopLocalVideoTile()
            if(videoInput){
                const videoProcessor = new DefaultVideoTransformDevice(
                    new ConsoleLogger('MeetingLogs', LogLevel.OFF),
                    videoInput, // device id string
                    [virtualBackgroundProcessor!]
                ) as VideoTransformDevice;
                meetingSession.audioVideo.chooseVideoInputDevice(videoProcessor).then(()=>{
                    meetingSession.audioVideo.startLocalVideoTile()
                })

                ////// こちらだとリモート側がブラックアプトする。コーデックの問題か？
                // console.log("videoInput!!!", videoInput)
                // meetingSession.audioVideo.chooseVideoInputDevice(videoInput).then(()=>{
                //     meetingSession.audioVideo.startLocalVideoTile()
                // })
            }
        }
    },[videoInput])

    const setVirtualBackgroundType = (val:VirtualBackgroundType) =>{
        virtualBackgroundProcessor?.setVirtualBackgroundType(val)
    }

    const setVirtualBackgroundImageImage = (path:string) =>{
        virtualBackgroundProcessor?.setBackgroundImage(path)
    }


    const joinMeeting = (meetingTitle:string, userName:string) => {
        console.log("joining!!!!")
        api.joinMeeting(meetingTitle, userName).then(meetingInfo => {
            const logger = new ConsoleLogger('MeetingLogs', LogLevel.OFF)
            const deviceController = new DefaultDeviceController(logger)
            const deviceChangeObserver = new DeviceChangeObserverImpl()
            deviceController.addDeviceChangeObserver(deviceChangeObserver)
            const configuration = new MeetingSessionConfiguration(meetingInfo.JoinInfo.Meeting, meetingInfo.JoinInfo.Attendee)
            const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController)


            class AudioVideoObserverImpl extends AudioVideoObserverTemplate{
                videoTileDidUpdate(tileState: VideoTileState): void {
                    setNewTileState(tileState)
                }
                videoTileWasRemoved():void{
                    setNewTileState(null)
                }
            }

            const audioVideoOserver = new AudioVideoObserverImpl()
            meetingSession.audioVideo.addObserver(audioVideoOserver)
            meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(attendeeIdPresenceSubscriber)
            meetingSession.audioVideo.subscribeToActiveSpeakerDetector(
                new DefaultActiveSpeakerPolicy(),
                activeSpeakerDetectorSubscriber,
                scores => {
                  //console.log("subscribeToActiveSpeakerDetector", scores)
                },100
            )
            const p1 = meetingSession.audioVideo.chooseAudioInputDevice(audioInput)
            const p2 = meetingSession.audioVideo.chooseAudioOutputDevice(audioOutput)

            let p3 = null
            if(videoInput){
                const videoProcessor = new DefaultVideoTransformDevice(
                    new ConsoleLogger('MeetingLogs', LogLevel.OFF),
                    videoInput, // device id string
                    [virtualBackgroundProcessor!]
                ) as VideoTransformDevice;
                p3 = meetingSession.audioVideo.chooseVideoInputDevice(videoProcessor)
            }

            Promise.all([p1,p2,p3]).then(()=>{
                const audioOutputElement = document.getElementById('audio-output') as HTMLAudioElement;              
                meetingSession.audioVideo.bindAudioElement(audioOutputElement);
                meetingSession.audioVideo.start()
                meetingSession.audioVideo.startLocalVideoTile()
            })
            setMeetingSession(meetingSession)
        })
    }

    const providerValue:MeetingStateValue = {
        meetingSession,
        joinMeeting,
        newTileState,

        setVirtualBackgroundType,
        setVirtualBackgroundImageImage,
    }

    return (
        <MeetingStateContext.Provider value={providerValue}>
            {children}
        </MeetingStateContext.Provider>
    )
}