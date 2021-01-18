import { Button, createStyles, FormControl, Grid, GridList, GridListTile, makeStyles, MenuItem, Select, Theme } from "@material-ui/core"
import { DefaultMeetingSession, DefaultVideoTransformDevice } from "amazon-chime-sdk-js"
import React, { createRef, useEffect, useState } from "react"
import { TextField } from "@material-ui/core"
import { useDeviceState } from "../providers/DeviceStateProvider"
import { InputLabel } from "@material-ui/core"
import { useAppState } from "../providers/AppStateProvider"
import { v4 } from 'uuid'
import { useMeetingState } from '../providers/MeetingProvider'
import { VirtualBackgroundType } from "../frameProcessors/VirtualBackground"

const MAX_VIDEO_NUM = 16

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      overflow: 'hidden',
      backgroundColor: theme.palette.background.paper,
    },
    gridList: {
      flexWrap: 'nowrap',
    //   Promote the list into his own layer on Chrome. This cost memory but helps keeping high FPS.
    transform: 'translateZ(0)',
    },
    title: {
      color: theme.palette.primary.light,
    },
    titleBar: {
      background:
        'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
    },


    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing(2),
      },
  }),
);


interface AppInfo{
    title?:string
    userName?:string
    meetingInfo?:any
    meetingSession?: DefaultMeetingSession
    transformDevice?: DefaultVideoTransformDevice
}

export const Chime = () => {
    const {audioInputList, videoInputList, audioOutputList} = useDeviceState()
    const { setAudioInput, setVideoInput, setAudioOutput} = useAppState()
    const { joinMeeting, meetingSession, newTileState, setVirtualBackgroundType, setVirtualBackgroundImageImage} = useMeetingState()

    const [inputMeetingTitle, setInputMeetingTitle] = useState("testmeeting")
    const [inputUserName, setInputUserName] = useState("testuser" + v4())

    const fileInputRef = createRef<HTMLInputElement>()
    const bgFileInputRef = createRef<HTMLInputElement>()
    const videoElementRef = createRef<HTMLVideoElement>()

    useEffect(()=>{

        const video_tile_local = document.getElementById(`video-tile-local`) as HTMLVideoElement
        const img_tile_local   = document.getElementById(`img-tile-local`) as HTMLImageElement

        meetingSession?.audioVideo.getLocalVideoTile()?.bindVideoElement(video_tile_local)
        if(video_tile_local){
            if(meetingSession?.audioVideo.getLocalVideoTile()?.state().active){
                video_tile_local.style.display = "block"
                img_tile_local.style.display   = "none"
            }else{
                video_tile_local.style.display = "none"
                img_tile_local.style.display   = "block"
            }
        }

        meetingSession?.audioVideo.getAllRemoteVideoTiles().forEach((tile)=>{
            if(tile.state().localTile) return
            console.log("useEffect!", `video-tile-remote-${tile.id()}`)
            const video_tile = document.getElementById(`video-tile-remote-${tile.id()}`) as HTMLVideoElement
            tile.bindVideoElement(video_tile)
        })
    })


    const join = () => {
        joinMeeting(inputMeetingTitle, inputUserName)
    }


    ///////////////////////
    /////// Device Change
    //////////////////////
    const onInputVideoChange = (e:any) =>{
        if(e.target.value === "None"){
            setVideoInput(null)
        }else if(e.target.value === "File"){
            fileInputRef.current!.click()
        }else{
            setVideoInput(e.target.value)
        }
    }
    const setInputVideoMovie = (path:string, fileType:string) => {
        if(fileType.startsWith("video")){
            const v = document.getElementById("input-video-movie")! as HTMLVideoElement
            v.pause()
            v.srcObject = null
            v.src = path
            v.currentTime=0
            v.autoplay = true
            v.play()

            v.onloadedmetadata = (e) =>{
                // @ts-ignore
                const mediaStream = v.captureStream() as MediaStream
                setVideoInput(mediaStream)
                // appInfo['transformDevice'] = appInfo['transformDevice']!.chooseNewInnerDevice(mediaStream)
                // appInfo['meetingSession']!.audioVideo.chooseVideoInputDevice(appInfo['transformDevice']  as VideoTransformDevice).then(()=>{
                //     appInfo['meetingSession']!.audioVideo.startLocalVideoTile()
                // })
            }
        }else{
            console.log("not supported filetype", fileType)
        }

    }
    const onInputAudioChange = (e:any) =>{
        const val = e.target.value === "None" ? null : e.target.value
        setAudioInput(val)
    }
    const onOutputAudioChange = (e:any) =>{
        const val = e.target.value === "None" ? null : e.target.value
        setAudioOutput(val)
    }
    const setBackgroundImage = (path:string, fileType:string) =>{
        if(fileType.startsWith("image")){
            setVirtualBackgroundImageImage(path)
        }else{
            console.log("not supported filetype", fileType)
        }
    }
    const onVirtualBackgroundTypeChange = (e:any) =>{
        const type = e.target.value as VirtualBackgroundType
        setVirtualBackgroundType(type)
    }

    const classes = useStyles();

    return (
        <div style={{position:"relative", width:"100%", height:"100%"}}>

            {/* ************************************** */}
            {/* *****   Control Header           ***** */}
            {/* ************************************** */}
            <div style={{position:"relative", alignItems:"flex-end", display:"flex", justifyContent:"center"}}>
                <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <TextField onChange={(e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>{setInputMeetingTitle(e.target.value)}} value={inputMeetingTitle} label="meeting title" defaultValue="meeting1"/>
                </FormControl>
                <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <TextField onChange={(e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>{setInputUserName(e.target.value)}}     value={inputUserName} label="user name"     defaultValue="user1"/>
                </FormControl>
                <Button color="primary" onClick={join}>
                    Join
                </Button>

                <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <InputLabel>Camera</InputLabel>
                    <Select onChange={onInputVideoChange}>
                        <MenuItem disabled value="Video">
                            <em>Video</em>
                        </MenuItem>
                        <MenuItem value="None">
                            <em>None</em>
                        </MenuItem>
                        {videoInputList?.map(dev=>{
                            return <MenuItem value={dev.deviceId}>{dev.label}</MenuItem>
                        })}
                        <MenuItem value="File">
                            <em>File</em>
                        </MenuItem>
                    </Select>
                </FormControl>

                {/* <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <InputLabel>Microhpone</InputLabel>
                    <Select onChange={onInputAudioChange}>
                        <MenuItem disabled value="Video">
                            <em>Microphone</em>
                        </MenuItem>
                        <MenuItem value="None">
                            <em>None</em>
                        </MenuItem>
                        {audioInputList?.map(dev=>{
                            return <MenuItem value={dev.deviceId}>{dev.label}</MenuItem>
                        })}
                    </Select>
                </FormControl>

                <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <InputLabel>Speaker</InputLabel>
                    <Select onChange={onOutputAudioChange}>
                        <MenuItem disabled value="Video">
                            <em>Speaker</em>
                        </MenuItem>
                        <MenuItem value="None">
                            <em>None</em>
                        </MenuItem>
                        {audioOutputList?.map(dev=>{
                            return <MenuItem value={dev.deviceId}>{dev.label}</MenuItem>
                        })}
                    </Select>
                </FormControl> */}

                <FormControl className={classes.formControl} style={{width:"10%"}}>
                    <InputLabel>VirtualBackground</InputLabel>
                    <Select onChange={onVirtualBackgroundTypeChange}>
                        <MenuItem disabled value="Video">
                            <em>VirtualBackground</em>
                        </MenuItem>
                        <MenuItem value="None">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value="BodyPix">
                            <em>BodyPix</em>
                        </MenuItem>
                        <MenuItem value="GoogleMeet">
                            <em>GoogleMeet</em>
                        </MenuItem>
                    </Select>
                </FormControl>

                <Button color="primary" onClick={()=>{bgFileInputRef.current!.click()}} >
                    Choose Image
                </Button>

            </div>


            {/* ************************************** */}
            {/* *****   Main Video               ***** */}
            {/* ************************************** */}
            {/* <div style={{position:"relative", alignItems:"flex-start", display:"flex", justifyContent:"center", width:"50%", height:"480px"}}>
                <video controls width="640px" style={{position:"absolute", objectFit:"cover", width:"100%"}} />
                <canvas width="640px" style={{position:"absolute", objectFit:"cover", width:"100%"}} />
            </div> */}


            {/* ************************************** */}
            {/* *****   Video Tile               ***** */}
            {/* ************************************** */}
            <div className={classes.root} style={{width:"80%", margin :"0 auto", position:"static"}}  >
                <Grid justify="center">
                    <GridList className={classes.gridList} cols={2}>
                        { 
                            (()=>{
                                const localVideoTile = 
                                    <GridListTile key={`grid-tile-local`} style={{width:"40%", height:"100%"}}>
                                        <div style={{width:"100%", height:"100%"}}>
                                            <video id="video-tile-local" style={{width:"100%", height:"100%"}}/>
                                            <img id="img-tile-local" src="./person.jpg" alt="" style={{width:"100%", height:"100%"}}/>
                                        </div>
                                    </GridListTile>
                                
                                const remoteVideoTiles = meetingSession?.audioVideo.getAllVideoTiles().map((tile)=>{
                                    if(tile.state().localTile){
                                        return undefined
                                    }
                                    return (
                                        <GridListTile key={`grid-tile-remote-${tile.id()}`} style={{width:"40%", height:"100%"}}>
                                            <video id={`video-tile-remote-${tile.id()}`} style={{width:"100%", height:"100%"}}/>
                                            {/* <GridListTileBar
                                                title={"name"}
                                                classes={{
                                                    root: classes.titleBar,
                                                    title: classes.title,
                                                }}
                                                actionIcon={
                                                    <IconButton aria-label={``}>
                                                    <StarBorderIcon className={classes.title}/>
                                                    </IconButton>
                                                }
                                            /> */}
                                        </GridListTile>
                                    )
                                })
                                remoteVideoTiles?.unshift(localVideoTile)
                                return remoteVideoTiles?.filter(e=>e!==undefined)

                            })()
                        }

                    </GridList>
                </Grid>
            </div>



            {/* ************************************** */}
            {/* *****   Hidden Elements          ***** */}
            {/* ************************************** */}
            <input type="file" hidden ref={fileInputRef} onChange={(e: any) => {
                const path = URL.createObjectURL(e.target.files[0]);
                const fileType = e.target.files[0].type
                setInputVideoMovie(path, fileType)
            }} />
            <video id="input-video-movie" loop hidden />

            <input type="file" hidden ref={bgFileInputRef} onChange={(e: any) => {
                const path = URL.createObjectURL(e.target.files[0]);
                const fileType = e.target.files[0].type
                setBackgroundImage(path, fileType)
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