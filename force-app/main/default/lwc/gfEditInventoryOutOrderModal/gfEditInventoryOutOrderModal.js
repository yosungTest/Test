import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import getPurchaseTypePicklist from '@salesforce/apex/GfAmsReleaseController.getPurchaseTypePicklist';
import initRecord from '@salesforce/apex/GfAmsReleaseController.initRecord';
import editRecord from '@salesforce/apex/GfAmsReleaseController.editRecord';


import USER_ID from "@salesforce/user/Id";
import LANGUAGELOCALEKEY from "@salesforce/schema/User.LanguageLocaleKey";

const INVENTORYOUT_ORDER_OBJECT_API_NAME = 'InventoryOutOrder__c';


export default class ParentComponent extends NavigationMixin(LightningElement){
    @api objectName;
    @api recordId;
    @api defaultValue;
    @api selectedIds;
    @api availableActions = [];
    
    @track isSpinner = false;

    purchaseTypeOptions = [];
    selectedIdList = [];
    deleteIdList    = [];

    @track orderInfo = {
        "name" : null,
        "partner" : null,
        "releaseDate" : null,
        "deliveryDate" : null,
        "requestDate" : null,
        "deliveryCompany" : null,
        "deliveryManager" : null,
        "purchaseType" : null,
        "zipCode" : null,
        "address" : null,
        "restofAddress" : null,
        "description" : null,
        "purchaseVendorId" : null,
        "purchaseOrderId"  : null,
        "itemList" : [],

        "purchaseOrderName"  : null,
        "purchaseOrderPurchaseVendor"  : null,
        "purchaseOrderAmount"  : null,
        "purchaseOrderOrderDate"  : null,

    };

    @track orderItemList = [];

    connectedCallback() {
        this.handleModalStyles();
        this.setDefaultRecord();
        this.loadPurchaseTypeOptions();
    }

    setDefaultRecord() {
        // flow에서 리스트형식의 데이터를 받고 싶을때 사용
        this.selectedIdList = this.selectedIds != null ? this.selectedIds.split(',') : null;
        if(this.selectedIdList) {
            this.recordId = this.selectedIdList[0];
            this.isSpinner = true;
            initRecord({"recordId" : this.recordId})
            .then( result => {
                if(result) {
                    this.orderInfo = result;
                    this.orderItemList = result.itemList;
                }
            })
            .catch( error => {
                console.log('error: ', error);
            })
            .finally(() => {
                this.isSpinner = false;
            })
        }else {
            this.orderInfo.registor = USER_ID;
        }
    }

    async loadPurchaseTypeOptions() {
        try {
            const picklistData = await getPurchaseTypePicklist();
            this.purchaseTypeOptions = Object.entries(picklistData).map(([label, value]) => ({
                label,value
            }));
        } catch (error) {
            console.error('Error:::', error);
        }
    }

    recordPickerMatchingInfos = {
        "registorMatchingInfo"              : { primaryField: { fieldPath: "Name" }, },
    }
    reocrdPickerDisplayInfos = {
        "registorDisplayInfo"               : { additionalFields: ["Username"] },
    }
    recordPickerfilters = {
        "registorFilter" : {
            "criteria" : [
                {
                    fieldPath: 'IsActive',
                    operator: 'eq',
                    value: true,
                },
            ],
        },
    }  
    handleRecordPicker(event) {
        let value = event.detail.recordId;
        let name = event.target.name;
        this.orderInfo[name] = value;
    }

    inputChangHandler(event) {
        let name = event.target.name;
        let value = event.detail.value;
        let index = event.target?.dataset?.index;
        switch (name){
            case 'partner':
                if (event.detail.Id) {
                    this.orderInfo[name] = event.detail.Id;
                    console.log('partner ID:', this.orderInfo[name]);
                } else {
                    console.error('Invalid partner ID');
                }
                break;

            default:
            if(index) {
                this.orderItemList[index][name] = value;
            }else {
                this.orderInfo[name] = value;
                console.log('::::',this.orderInfo[name]);
            }
            break;
        }
    }

    get totalAmount() {
        let totalAmount = 0;
        if(this.orderItemList && this.orderItemList.length > 0) {
            this.orderItemList.forEach( item => {
                if(item.netPrice != null) {
                    totalAmount +=  this.formatedInteger(item.netPrice)*this.formatedInteger(item.quantityOrder);
                }
            })
        }else {
            totalAmount = 0;
        }

        return new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(totalAmount); 
    }

    get amount() {
        return new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(this.orderInfo.purchaseOrderAmount); 
    }

    /**
     * 문자열에서 숫자 찾아주는 함수
     * @param {*} s 
     * @returns 
     */
    formatedInteger(s) {
        let answer = 0;
        if( typeof s === 'string') {
            let str = s.replace(/[^0-9]/g, "");
            let num = parseInt(str);
            answer = num;
        }else {
            answer = s;
        }

        return answer;
    }

    handleModalStyles() {
        this.modalStyleElement = document.createElement('style');
        this.modalStyleElement.textContent = `
            @media (min-width: 48em) {
                .slds-modal__container {
                    width: 100%;
                    max-width: 65rem;
                }
                
                /* 기존 모달의 z-index 설정 */
                .slds-modal {
                    z-index: 9000;
                }
                .slds-modal__container {
                    z-index: 9001;
                }
                
                /* 검색 모달용 스타일 */
                .my-custom-modal-on-top {
                    z-index: 9002;
                }
                .my-custom-modal-on-top .slds-modal__container {
                    z-index: 9003;
                }
                
                /* 배경 레이어 설정 */
                .slds-backdrop {
                    z-index: 8999;
                }
                .my-custom-modal-on-top + .slds-backdrop {
                    z-index: 9002;
                }
            }
        `;
        document.head.appendChild(this.modalStyleElement);
    }

    disconnectedCallback() {
        // 컴포넌트가 제거될 때 스타일 요소도 제거
        if (this.modalStyleElement && this.modalStyleElement.parentNode) {
            this.modalStyleElement.parentNode.removeChild(this.modalStyleElement);
        }
    }

    handleClickButton(event) {
        let name = event.target.name;
        let index = event.target?.dataset?.index;
        switch (name) {
            case 'save':
                this.handleUpdateRecord();
                break;
            case 'delete':
                this.handleDelete(index);
                break;
            default:
                break;
        }
    }

    handleDelete(index) {
        console.log('Delete!!!');
        console.log('Index:', index);
    
        if (index !== undefined && index >= 0 && index < this.orderItemList.length) {
            const itemToDelete = this.orderItemList[index];
    
            if (itemToDelete.id) {
                this.deleteIdList.push(itemToDelete.id);
                console.log('id:::::', itemToDelete.id);
            }

            this.orderItemList.splice(index, 1);
            console.log('ItemList::', this.orderItemList);
        } else {
            console.error('error', index);
        }
        console.log('deleteIdList:', this.deleteIdList);
    }

    handleUpdateRecord() {
        this.orderInfo.itemList = this.orderItemList;
        console.log('this.orderInfo:::',JSON.stringify(this.orderInfo));
        console.log('this.deleteIdList:::',JSON.stringify(this.deleteIdList));
        this.isSpinner = true;
        editRecord({"record" : JSON.stringify(this.orderInfo), "deleteIdList" : this.deleteIdList})
        .then( result => {
            if(result.isSuccess) {
                this.navigateToObjectHome('view', 'standard__recordPage', result.isSuccess);
                this.closeFlow();
            }
        })
        .then( error => {
            console.log('error: ', error);
        })
        .finally( () => {
            this.isSpinner = false;
        })
    }

    closeFlow() {
        if (this.availableActions.find((action) => action === 'FINISH')) {
            const navigateNextEvent = new FlowNavigationFinishEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }
    
    navigateToObjectHome(actionName, actionType, recordId) {
        let pageRef = {
                type: actionType,
                attributes: {
                    objectApiName: INVENTORYOUT_ORDER_OBJECT_API_NAME,
                    actionName: actionName,
                    recordId : recordId
                }
            }
        if(pageRef) {
            this[NavigationMixin.Navigate](pageRef);
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }
}