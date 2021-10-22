const kaltura = require('kaltura-client');
let my = require('./config.json');
var fs = require('fs');

class Livestream {
    constructor() {
        this.config = new kaltura.Configuration();
        this.config.serviceUrl = my['service_url'];
        this.client = new kaltura.Client(this.config);
    }
    step1conversionProfile() {
        let filter = new kaltura.objects.ConversionProfileFilter();
        filter.systemNameEqual = "Default_Live";
        let pager = new kaltura.objects.FilterPager();

        kaltura.services.conversionProfile.listAction(filter, pager)
            .execute(this.client)
            .then(result => {
                this.cloud_transcode_conversion_profile_id = result.objects[0].id;
                console.log('\nstep1conversionProfile=', this.cloud_transcode_conversion_profile_id);
                this.step2presentationProfile();
            });
    }
    step2presentationProfile() {
        let filter = new kaltura.objects.ConversionProfileFilter();
        filter.systemNameEqual = "KMS54_NEW_DOC_CONV_IMAGE_WIDE";
        let pager = new kaltura.objects.FilterPager();

        kaltura.services.conversionProfile.listAction(filter, pager)
            .execute(this.client)
            .then(result => {
                this.presentation_conversion_profile_id = result.objects[0].id;
                console.log('\nstep2presentationProfile=', this.presentation_conversion_profile_id);
                this.step3liveStream();
            });
    }
    step3liveStream() {
        let liveStreamEntry = new kaltura.objects.LiveStreamEntry();
        liveStreamEntry.name = "Live Webcasting Event";
        liveStreamEntry.description = "Welcome to the Live Webcasting Event";
        liveStreamEntry.mediaType = kaltura.enums.MediaType.LIVE_STREAM_FLASH;
        liveStreamEntry.dvrStatus = kaltura.enums.DVRStatus.ENABLED;
        liveStreamEntry.dvrWindow = 60;
        liveStreamEntry.sourceType = kaltura.enums.SourceType.LIVE_STREAM;
        liveStreamEntry.adminTags = "kms-webcast-event,vpaas-webcast";
        liveStreamEntry.pushPublishEnabled = kaltura.enums.LivePublishStatus.DISABLED;
        liveStreamEntry.explicitLive = kaltura.enums.NullableBoolean.TRUE_VALUE;
        liveStreamEntry.recordStatus = kaltura.enums.RecordStatus.PER_SESSION;
        liveStreamEntry.conversionProfileId = this.cloud_transcode_conversion_profile_id;
        liveStreamEntry.entitledUsersEdit = my['admin_email'];
        liveStreamEntry.recordingOptions = new kaltura.objects.LiveEntryRecordingOptions();
        liveStreamEntry.recordingOptions.shouldCopyEntitlement = kaltura.enums.NullableBoolean.TRUE_VALUE;
        liveStreamEntry.recordingOptions.shouldMakeHidden = kaltura.enums.NullableBoolean.TRUE_VALUE;
        liveStreamEntry.recordingOptions.shouldAutoArchive = kaltura.enums.NullableBoolean.TRUE_VALUE;

        kaltura.services.liveStream.add(liveStreamEntry, liveStreamEntry.sourceType)
            .execute(this.client)
            .then(result => {
                this.live_stream_entry_id = result.id;
                console.log('\nstep3liveStream=', this.live_stream_entry_id);
                this.step4metadataProfile();
            });
    }
    step4metadataProfile() {
        let filter = new kaltura.objects.MetadataProfileFilter();
        filter.systemNameEqual = "KMS_KWEBCAST2";
        let pager = new kaltura.objects.FilterPager();

        kaltura.services.metadataProfile.listAction(filter, pager)
            .execute(this.client)
            .then(result => {
                this.kms_metadata_profile_id = result.objects[0].id;
                console.log('\nstep4metadataProfile=', this.kms_metadata_profile_id);
                this.step5addMetadata();
            });
    }
    step5addMetadata() {
        let xmlData = '<?xml version="1.0"?><metadata><SlidesDocEntryId></SlidesDocEntryId><IsKwebcastEntry>1</IsKwebcastEntry><IsSelfServe>1</IsSelfServe></metadata>';

        kaltura.services.metadata.add(this.kms_metadata_profile_id, kaltura.enums.MetadataObjectType.ENTRY, this.live_stream_entry_id, xmlData)
            .execute(this.client)
            .then(result => {
                this.kms_metadata_record_id = result.id;
                console.log('\nstep5addMetadata=', this.kms_metadata_record_id);
                this.step6eventMetadata();
            });
    }
    step6eventMetadata() {
        let filter = new kaltura.objects.MetadataProfileFilter();
        filter.systemNameEqual = "KMS_EVENTS3";
        let pager = new kaltura.objects.FilterPager();

        kaltura.services.metadataProfile.listAction(filter, pager)
            .execute(this.client)
            .then(result => {
                this.events_metadata_profile_id = result.objects[0].id;
                console.log('\nstep6eventMetadata=', this.events_metadata_profile_id);
                this.step7addEvent();
            });
    }
    step7addEvent() {
        let t1 = new Date();
        t1.setMinutes(t1.getMinutes() + 5);
        this.webcast_start_dateInt = Math.floor(t1.getTime() / 1000).toString();
        t1 = t1.toISOString()
        t1 = t1.substring(0, t1.length - 5) + '-04:00';
        this.webcast_start_date = t1;

        let t2 = new Date();
        t2.setMinutes(t2.getMinutes() + 35);
        this.webcast_end_dateInt = Math.floor(t2.getTime() / 1000).toString();
        t2 = t2.toISOString()
        t2 = t2.substring(0, t2.length - 5) + '-04:00';
        this.webcast_end_date = t2;
        let xmlData = `<?xml version="1.0"?><metadata><StartTime>{START_TIME}</StartTime>
        <EndTime>{END_TIME}</EndTime><Timezone>America/New_York</Timezone>
        <Presenter><PresenterId>8723792</PresenterId><PresenterName>Ron Raz</PresenterName>
        <PresenterTitle>CEO and Chairman</PresenterTitle><PresenterBio>Awesome biography here</PresenterBio>
        <PresenterLink>https://www.linkedin.com/in/john.doe</PresenterLink>
        </Presenter></metadata>`.replace('{START_TIME}', this.webcast_start_dateInt).replace('{END_TIME}', this.webcast_end_dateInt);
        kaltura.services.metadata.add(this.events_metadata_profile_id, kaltura.enums.MetadataObjectType.ENTRY, this.live_stream_entry_id, xmlData)
            .execute(this.client)
            .then(result => {
                this.event_metadata_record_id = result.id;
                console.log('\nstep7addEvent=', this.event_metadata_record_id);
                this.step8downloadLinks();
            });
    }
    step8downloadLinks() {
        let filter = new kaltura.objects.UiConfFilter();
        filter.objTypeEqual = kaltura.enums.UiConfObjType.WEBCASTING;
        let pager = new kaltura.objects.FilterPager();

        kaltura.services.uiConf.listTemplates(filter, pager)
            .execute(this.client)
            .then(result => {
                let first = result.objects[0];
                let uiconf = JSON.parse(first['config']);
                this.mac_download_url = uiconf['osx']['recommendedVersionUrl'];
                this.win_download_url = uiconf['windows']['recommendedVersionUrl'];
                console.log('\nstep8downloadLinks=', this.mac_download_url, this.win_download_url);
                this.step9prepLaunch();
            });
    }
    step9prepLaunch() {
        let expiry = new Date(Date.now());
        expiry.setDate(expiry.getDate() + 1);

        let privileges = "setrole:WEBCAST_PRODUCER_DEVICE_ROLE,sview:*,list:{ENTRY_ID},download:{ENTRY_ID}".replace(/{ENTRY_ID}/g, this.live_stream_entry_id);
        kaltura.services.session.start(my['admin_secret'], my['broadcaster_user'], kaltura.enums.SessionType.USER, my['partner_id'], 86400, privileges)
            .execute(this.client)
            .then(result => {
                this.kaltura_session = result;

                let launch_params = {
                    "ks": this.kaltura_session,
                    "ks_expiry": expiry.toISOString(),
                    "MediaEntryId": this.live_stream_entry_id,
                    "uiConfID": my['mac_uiconf_id'],
                    "serverAddress": my['service_url'],
                    "eventsMetadataProfileId": this.events_metadata_profile_id,
                    "kwebcastMetadataProfileId": this.kms_metadata_profile_id,
                    "appName": my['app_name'],
                    "logoUrl": my['logo_url'],
                    "fromDate": this.webcast_start_date,
                    "toDate": this.webcast_end_date,
                    "userId": my['broadcaster_display_name'],
                    "QnAEnabled": true,
                    "pollsEnabled": true,
                    "userRole": "adminRole",
                    "playerUIConf": my['uiconf_idv2'],
                    "presentationConversionProfileId": this.presentation_conversion_profile_id,
                    "referer": my['app_domain'],
                    "debuggingMode": false,
                    "verifySSL": true,
                    "selfServeEnabled": true,
                    "appHostUrl": '',
                    "instanceProfile": my['app_name']
                };
                this.data = {
                    "entry_id": this.live_stream_entry_id,
                    "mac_download": this.mac_download_url,
                    "windows_download": this.win_download_url,
                    "launch_params": launch_params
                };
                console.log('\nstep9prepLaunch=', this.data);
                this.step10generateHtml();
            });
    }
    step10generateHtml() {
        // generate entry.html
        let html = fs.readFileSync('./html/entry-template.html', 'utf-8');
        let moderatorViewBase = 'https://www.kaltura.com/apps/webcast/vlatest/index.html?'
        let moderatorViewParams = 'MediaEntryId={live_stream_entry_id}&ks={ks}&ks_expiry={ts_expiry}&qnaModeratorMode=True&serverAddress={server_address}&fromDate={fromDate}&toDate={toDate}'.replace(/{live_stream_entry_id}/g, this.live_stream_entry_id).replace('{ks}', encodeURIComponent(this.kaltura_session)).replace('{ts_expiry}', encodeURIComponent(this.webcast_end_date)).replace('{server_address}', encodeURIComponent(my['service_url'])).replace('{fromDate}', encodeURIComponent(this.webcast_start_date)).replace('{toDate}', encodeURIComponent(this.webcast_end_date))
        let moderatorView = moderatorViewBase + moderatorViewParams
        let newHtml = html.replace(/{live_stream_entry_id}/g, this.live_stream_entry_id).replace("'{launch_params}'", JSON.stringify(this.data.launch_params)).replace('{moderator_view}', moderatorView).replace('{mac_download}', this.mac_download_url).replace('{win_download}', this.win_download_url);
        fs.writeFileSync('./html/entry.html', newHtml);
        this.response.sendFile(__dirname + '/html/entry.html');
        // generate view.html
        html = fs.readFileSync('./html/view-template.html', 'utf-8');
        newHtml = html.replace(/{partner_id}/g, my['partner_id']).replace(/{uiconf_id}/g, my['uiconf_idv2']).replace(/{live_stream_entry_id}/g, this.live_stream_entry_id).replace('{ks}', this.kaltura_session).replace(/{app_name}/g, my['app_name']).replace(/{user_id}/g, my['viewer_user_id']);
        fs.writeFileSync('./html/view.html', newHtml);
        console.log('\nstep10generateHtml= entry.html, view.html');
    }
    create(res) {
        this.response = res;
        kaltura.services.session.start(
                my['admin_secret'], my['admin_email'], kaltura.enums.SessionType.ADMIN, my['partner_id'])
            .completion((success, ks) => {
                if (!success) throw new Error(ks.message);
                this.client.setKs(ks);
                this.step1conversionProfile();
            })
            .execute(this.client);
    }
    response = null;
    config = null;
    client = null;
    cloud_transcode_conversion_profile_id = null;
    presentation_conversion_profile_id = null;
    live_stream_entry_id = null;
    kms_metadata_profile_id = null;
    kms_metadata_record_id = null;
    events_metadata_profile_id = null;
    event_metadata_record_id = null;
    mac_download_url = null;
    win_download_url = null;
    kaltura_session = null;
    data = null;
    webcast_start_dateInt = null;
    webcast_end_dateInt = null;
    webcast_start_date = null;
    webcast_end_date = null;
    data = null;
}

module.exports = Livestream;