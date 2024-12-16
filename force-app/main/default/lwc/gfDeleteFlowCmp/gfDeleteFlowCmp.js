import { LightningElement, api, wire } from 'lwc';
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deleteRecords from '@salesforce/apex/GfDeleteFlowController.deleteRecords';

export default class GfDeleteFlowCmp extends LightningElement {
    @api objectName;
    @api selectedIds;

    connectedCallback() {
        const recordIds = this.parseRecordIds(this.selectedIds);
        this.deleteRecords(recordIds);
    }

    parseRecordIds(concatenatedIds) {
        const idLength = 18;
        const recordsArray = [];
        for (let i = 0; i < concatenatedIds.length; i += idLength) {
            recordsArray.push(concatenatedIds.substring(i, i + idLength));
        }
        return recordsArray;
    }

    deleteRecords(recordIds) {
        deleteRecords({ objectName: this.objectName, ids: recordIds })
            .then(() => {
                this.showToast('Success', '삭제 완료됐습니다.', 'success');
                this.handleGoFinish();
            })
            .catch(error => {
                this.showToast('Error', 'Error deleting records: ' + error.body.message, 'error');
            });
    }

    handleGoFinish() {
        const navigateFinishEvent = new FlowNavigationFinishEvent();
        this.dispatchEvent(navigateFinishEvent);
    }
    
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}