import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { NavigationMixin } from 'lightning/navigation';
import getPurchaseOrder from '@salesforce/apex/GfAmsReleaseController.getPurchaseOrder';
import getPurchaseOrderItems from '@salesforce/apex/GfAmsReleaseController.getPurchaseOrderItems';
import getPurchaseTypePicklist from '@salesforce/apex/GfAmsReleaseController.getPurchaseTypePicklist';
import insertRecord from '@salesforce/apex/GfAmsReleaseController.insertRecord';

import USER_ID from "@salesforce/user/Id";
import LANGUAGELOCALEKEY from "@salesforce/schema/User.LanguageLocaleKey";

const INVENTORYOUT_ORDER_OBJECT_API_NAME = 'InventoryOutOrder__c';


export default class ParentComponent extends NavigationMixin(LightningElement){
    @api objectName;
    @api recordId;
    @api defaultValue;
    @api selectedIds;
    
    @track purchaseOrder = {}; 
    @track purchaseOrderItems = [];
    @track isSpinner = false;

    purchaseTypeOptions = [];

    @track orderInfo = {
        "name" : null,
        "partner" : null,
        "releaseDate" : this.getToday(),
        "deliveryDate" : null,
        "requestDate" : null,
        "deliveryCompany" : null,
        "deliveryManager" : null,
        "purchaseType" : 'General',
        "zipCode" : null,
        "address" : null,
        "restofAddress" : null,
        "description" : null,
        "purchaseVendorId" : null,
        "purchaseOrderId"  : null,
        "itemList" : [],
    };

    @track orderItemList = [];

    connectedCallback() {
        this.handleModalStyles();
        this.orderInfo.deliveryManager = USER_ID;
        console.log('selectedIds:::',this.selectedIds);
        Promise.all([
            this.loadPurchaseOrder(),
            this.loadPurchaseOrderItems(),
            this.loadPurchaseTypeOptions()
        ])
        .finally(() => {
            this.isSpinner = false;
        });
    }

    async loadPurchaseOrder() {
        await getPurchaseOrder({ recordId: this.selectedIds })
            .then((result) => {
                this.purchaseOrder = result;
                // purchaseOrder의 배송요청일을 orderInfo에 복사
                if (this.purchaseOrder) {
                    this.orderInfo = {
                        ...this.orderInfo,
                        requestDate: this.purchaseOrder.requestDate,
                        zipCode : this.purchaseOrder.zipCode,
                        address : this.purchaseOrder.address,
                        restofAddress : this.purchaseOrder.restofAddress,
                        purchaseVendorId : this.purchaseOrder.purchaseVendorId,
                        purchaseOrderId : this.purchaseOrder.id
                    };
                }
            })
            .catch((error) => {
                console.error('Error:::', error);
            })
            .finally(() => {
                this.isSpinner = false;
            });
    }

    async loadPurchaseOrderItems() {
        try {
            this.purchaseOrderItems = await getPurchaseOrderItems({ recordId: this.selectedIds });
            console.log('purchaseOrderItems::::',this.purchaseOrderItems);
        } catch (error) {
            console.error('Error:::::', error);
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

    @wire(getRecord, { recordId: USER_ID, fields: [LANGUAGELOCALEKEY] })
    userDetails({ error, data }) {
        if (data) {
            this.userLanguage = data.fields.LanguageLocaleKey.value;
            this.isKo = data.fields.LanguageLocaleKey.value == "ko" ? true : false;
        } else if (error) {
            console.log("Error: ", error);
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
                this.purchaseOrderItems[index][name] = value;
            }else {
                this.orderInfo[name] = value;
            }
            break;
        }
    }

    // handleSelectedRow(event) {
    //     let name = event.target.name;
    //     let checked = event.target.checked;
    //     let index = event.target.dataset.index;
    //     if(index) {
    //         this.orderItemList[index][name] = !checked;       
    //     }
    //     // 이벤트 버블링으로 인해 체크박스 함수 두번 실행되서 그걸 막기위해 사용
    //     event.preventDefault();
        
    // }

    handleSaveRecord() {
        this.orderInfo.itemList = this.purchaseOrderItems;
        this.isSpinner = true;
        console.log('record:::::',JSON.stringify(this.orderInfo));
        insertRecord({"record" : JSON.stringify(this.orderInfo)}).then(result => {
            if(result) {
                console.log('result: ', result);
                this.navigateToObjectHome('view', 'standard__recordPage', result);
            }
            console.log('result: ', result);
        })
        .catch( error => {
            console.log('error: ', error);
        })
        .finally(() => {
            this.isSpinner = false;
        })
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

    // 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환
    getToday() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    get totalAmount() {
        let totalAmount = 0;
        if(this.purchaseOrderItems && this.purchaseOrderItems.length > 0) {
            this.purchaseOrderItems.forEach( item => {
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
        return new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(this.purchaseOrder.amount); 
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

    handleQuantityMatch() {
        // 각 줄의 발주수량을 출고수량에 복사
        this.purchaseOrderItems = this.purchaseOrderItems.map(item => ({
            ...item,
            quantityOrder: item.quantity
        }));
    
        // 업데이트된 데이터 확인
        console.log('Updated Items:', this.purchaseOrderItems);
    }
}