export const attendeeIdPresenceSubscriber = (attendeeId: string, present: boolean) => {
    console.log(`attendeeIdPresenceSubscriber ${attendeeId} present = ${present}`);
}

export const activeSpeakerDetectorSubscriber = (attendeeIds: string[]) => {
    console.log(`activeSpeakerDetectorSubscriber ${attendeeIds}`);
}