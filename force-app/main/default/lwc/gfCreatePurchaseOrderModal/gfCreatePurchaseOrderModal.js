import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { NavigationMixin } from 'lightning/navigation';
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';
import LightningAlert from "lightning/alert";

import USER_ID from "@salesforce/user/Id";
import LANGUAGELOCALEKEY from "@salesforce/schema/User.LanguageLocaleKey";

// Modal
import SEARCH_MODAL from 'c/gfProductSearchMoadl';

// Apex
import settingPickListOptions from '@salesforce/apex/GfCreatePurchaseOrderModalController.settingPickListOptions';
import initRecord from '@salesforce/apex/GfCreatePurchaseOrderModalController.initRecord';
import insertRecord from '@salesforce/apex/GfCreatePurchaseOrderModalController.insertRecord';
import editRecord from '@salesforce/apex/GfCreatePurchaseOrderModalController.editRecord';

// Template
import CREATE_TYPE from './Template/typeA';             // New Record
import EDIT_Type from './Template/typeB';               // Edit Record

const PURCHASE_ORDER_OBJECT_API_NAME = 'PurchaseOrder__c';
const PURCHASE_ORDER_ITEM_API_NAME = 'PurchaseOrderLineItem__c';
const PURCHASE_ORDER_FIELD_NAME = ["OrderType__c"];
const PURCHASE_ORDER_ITEM_FIELD_NAME = ["SkuOption1__c", "SkuOption2__c", "SkuOption3__c", "OrderType__c"];

export default class GfCreatePurchaseOrderModal extends NavigationMixin(LightningElement) {
    @api objectName;
    @api recordId;
    @api defaultValue;
    @api selectedIds;
    @api availableActions = [];

    @track orderInfo = {
        "orderNumber"       : null,
        "purchaseVender"    : null,
        "partnerId"         : null,
        "requestDate"       : null,
        "purchaseDate"      : null,
        "zipCode"           : null,
        "address"           : null,
        "addressDetail"     : null,
        "netAmount"         : null,
        "registor"          : null,
        "description"       : null,
        "orderType"         : null,
        "itemList"          : [],
    };
    @track orderItemList = [];

    isSpinner = false;
    isKo = false;
    isOrderItemList = false;

    colorOptions    = [];
    sizeOptions     = [];
    materialOptions = [];
    orderType       = [];
    selectedIdList  = [];
    deleteIdList    = [];
    
    userLanguage;

    /**
     * Record Picker Matching Info 모음
     */
    recordPickerMatchingInfos = {
        "partnerMatchingInfo"               : { primaryField: { fieldPath: "Name" }, additionalFields: [ { fieldPath: 'PartnerCode__c'}] },
        "registorMatchingInfo"              : { primaryField: { fieldPath: "Name" }, },
        "purchaseVenderMatchingInfo"        : { primaryField: { fieldPath: "Name" }, },
    }

    /**
    * Record Picker Display Info 모음
    */
    reocrdPickerDisplayInfos = {
        "partnerDisplayInfo"                : { additionalFields: ["PartnerCode__c"] },
        "registorDisplayInfo"               : { additionalFields: ["Username"] },
        "purchaseVenderDisplayInfo"         : { additionalFields: ["PurchaseVendorType__c"] },
    }

    /**
     * Lightning-Record-Picker Filter Info 모음
     *  Record-Picker Filter operator 참고자료
        eq:   equals (=)
        ne:   Not equals (!=)
        like: LIKE (%)
        lt:   Less than (<)
        gt:   Greater than (>)
        lte:  Less than equal (<=)
        gte:  Greater than equal (>=)
        in:   IN (IN)
        nin:  NOT IN (NOT IN)
        inq:  semi query 
            ex) Id: { inq: {
                    Opportunity: {
                    StageName: { eq: "Closed Won" } },
                    ApiName:"AccountId"
                    }
                }
            ninq: semi query
            ex) Id: { ninq: {
                    Opportunity: {
                    IsClosed: { eq: false } },
                    ApiName:"AccountId"
                }
                    }
        criteria: [
            {
                fieldPath: 'field1',
                operator: 'eq',
                value: 'Booked'
            },
            {
                fieldPath: 'field2',
                operator: 'eq',
                value: this.partnerId
            },
            {
                fieldPath: 'field3',
                operator: 'eq',
                value: this.partnerId
            }
        ],
        filterLogic: '1 AND (2 OR 3)'
     */
    recordPickerfilters = {
        "partnerFilter" : {
            "criteria" : [
                {
                    fieldPath: 'Active__c',
                    operator: 'eq',
                    value: true,
                },
            ],
        },
        "registorFilter" : {
            "criteria" : [
                {
                    fieldPath: 'IsActive',
                    operator: 'eq',
                    value: true,
                },
            ],
        },
        "purchaseVenderFilter" : {
            "criteria" : [
                {
                    fieldPath: 'Active__c',
                    operator: 'eq',
                    value: true,
                },
            ],
        },
    }    

    /**
     * 로그인 유저 정보 가져오는 함수
     * @param {*} param0
     */
    @wire(getRecord, { recordId: USER_ID, fields: [LANGUAGELOCALEKEY] })
    userDetails({ error, data }) {
        if (data) {
            this.userLanguage = data.fields.LanguageLocaleKey.value;
            this.isKo = data.fields.LanguageLocaleKey.value == "ko" ? true : false;
        } else if (error) {
            console.log("Error: ", error);
        }
    }    

    get totalAmount() {
        let totalAmount = 0;
        if(this.orderItemList && this.orderItemList.length > 0) {
            this.orderItemList.forEach( item => {
                if(item.totalPrice != null) {
                    totalAmount +=  this.formatedInteger(item.totalPrice);
                }
            })
        }else {
            totalAmount = 0;
        }

        return new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(totalAmount); 
    }

    /**
     * 생성자 함수
     */
    constructor() {
        super();

    }

    /**
     * 화면 렌더링시 템플릿 선택 함수
     * @returns 
     */
    render(){
       return this.defaultValue == 'Edit' ? EDIT_Type : CREATE_TYPE;
    }

    connectedCallback() {
        this.settingPickList();
        this.setDefaultRecord();
        this.handleModalStyles();
    } 

    /**
     * 모달 스타일 설정 함수
     * 모달 컨테이너의 너비와 최대/최소 크기를 설정합니다.
     */
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

    /**
     * Combobox Options 생성 함수
     */
    settingPickList() {
        settingPickListOptions({'purchasePickListFiledName' : PURCHASE_ORDER_FIELD_NAME, 'purchaseItemPickListFiledName' : PURCHASE_ORDER_ITEM_FIELD_NAME})
        .then( result => {
            if(result) {
                let purchaseOrderOptions = result.PurchaseOrder__c;
                let purchaseOrderItemOptions = result.PurchaseOrderLineItem__c;
                this.orderType       = purchaseOrderOptions.OrderType__c;
                this.colorOptions    = purchaseOrderItemOptions.SkuOption1__c;
                this.sizeOptions     = purchaseOrderItemOptions.SkuOption2__c;
                this.materialOptions = purchaseOrderItemOptions.SkuOption3__c;
            }
        })
        .catch( error => {
            console.log('error: ', error);
        })
    }

    /**
     * 기본값 설정함수
     */
    setDefaultRecord() {
        // flow에서 리스트형식의 데이터를 받고 싶을때 사용
        this.selectedIdList = this.selectedIds != null ? this.selectedIds.split(',') : null;
        if( this.defaultValue && this.selectedIdList) {
            this.recordId = this.selectedIdList[0];
            this.isSpinner = true;
            initRecord({"recordId" : this.recordId})
            .then( result => {
                if(result) {
                    this.orderInfo = result;
                    this.orderItemList = result.itemList;
                    this.orderItemList.forEach( item => {
                        if(item.totalPrice) {
                            item.totalPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(item.totalPrice);
                        }
                        if(item.productPrice) {
                            item.productPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(item.productPrice);
                        }
                    })
                    this.isOrderItemList = this.orderItemList.length > 0 ? true : false;
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
            let today =  new Date().toLocaleDateString().replace(/\./g, '').replace(/\s/g, '-');
            this.orderInfo.purchaseDate = today; 
        }
    }

    /**
     * 버튼 클릭시 실행되는 함수
     * @param {*} event 
     */
    handleClickButton(event) {
        let name = event.target.name;
        let index = event.target?.dataset?.index;
        switch (name) {
            case 'search':
                this.handleSearchProduct();
                break;

            case 'save':
                if(this.defaultValue === 'Edit') {
                    this.handleUpdateRecord();
                }else {
                    this.handleSaveRecord();
                }
                break;

            case 'delete':
                this.handleDelete(index);
                break;
        
            default:
                break;
        }
    }

    /**
     * Record Picker 실행시 실행되는 함수
     * @param {*} event 
     */
    handleRecordPicker(event) {
        let value = event.detail.recordId;
        let name = event.target.name;
        this.orderInfo[name] = value;
    }

    /**
     * Input 입력시 실행되는 함수
     * @param {*} event 
     */
    handleChangeInput(event) {
        let name = event.target.name;
        let value = event.detail.value;
        let index = event.target?.dataset?.index;
        switch (name) {
            case 'quantity':
                if(index && value) {
                    this.handleChangeQuantity(index, value);
                    this.orderItemList[index][name] = value; //추가
                }else {
                    this.orderItemList[index][name] = null;
                    this.orderItemList[index].totalPrice = null;
                }
                break;

            case 'color':
                if(index && value) {
                    this.orderItemList[index][name] = value;
                    this.checkDuplicateOptionType(index, name);
                }else {
                    this.orderItemList[index][name] = null;
                }
                break;

            case 'size':
                if(index && value) {
                    this.orderItemList[index][name] = value;
                    this.checkDuplicateOptionType(index, name);
                }else {
                    this.orderItemList[index][name] = null;
                }
                break;

            case 'material':
                if(index && value) {
                    this.orderItemList[index][name] = value;
                    this.checkDuplicateOptionType(index, name);
                }else {
                    this.orderItemList[index][name] = null;
                }
                break;

            default:
                if(index) {
                    this.orderItemList[index][name] = value;
                }else {
                    this.orderInfo[name] = value;
                }
                break;
        }
    }

    /**
     * 제품 찾기 모달창 함수
     */
    handleSearchProduct() {
        SEARCH_MODAL.open({
            label: 'Search Product',
            size: 'medium', 
            description: '제품 찾기',
            cssClass: 'my-custom-modal-on-top'
        }).then((result) => {
            if(result && result.selectedData) {
                console.log('result: ', result);
                this.orderItemList.push(...result.selectedData);
                this.isOrderItemList = true;
            }
        });
    }

    /**
     * 발주수량 입력시 실행되는 함수
     * @param {*} index 
     * @param {*} value 
     */
    handleChangeQuantity(index, value) {
        let productPrice = this.formatedInteger(this.orderItemList[index]?.productPrice);
        let totalPrice = productPrice * value;
        this.orderItemList[index].totalPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(totalPrice);

        // 나라별 통화 설정시 사용
        // if(this.isKo) {
        //     this.orderItemList[index].totalPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(totalPrice);
        // }else {
        //     this.orderItemList[index].totalPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "USD" }).format(totalPrice);
        // }
    }

    /**
     * 데이터 저장 함수
     */
    handleSaveRecord() {
        if(this.orderItemList.length > 0) {
            this.orderInfo.itemList = this.orderItemList;
            this.isSpinner = true;
            insertRecord({"record" : JSON.stringify(this.orderInfo)}).then(result => {
                if(result) {
                    this.navigateToObjectHome('view', 'standard__recordPage', result);
                    this.closeFlow();
                }
            })
            .catch( error => {
                this.handleAlertClick('Error', error.body.message , 'error');
                console.log('error: ', error);
            })
            .finally(() => {
                this.isSpinner = false;
            })
        }

    }

    /**
     * 데이터 수정 함수
     */
    handleUpdateRecord() {
        this.orderInfo.itemList = this.orderItemList;
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

    /**
     * 같은 상품의 옵션 중복 체크 함수
     * @param {*} inx 현재 선택된 인덱스
     * @param {*} name 변경된 필드명
     */
    checkDuplicateOptionType(inx, name) {
        let productCode = this.orderItemList[inx].productCode;
        let color = this.orderItemList[inx].color;
        let size = this.orderItemList[inx].size;
        let material = this.orderItemList[inx].material;
    
        // 모든 옵션값이 있을 때만 중복 체크
        if(color && size && material) {
            let isCheckOption = this.orderItemList.some((item, index) => {
                return index != inx && 
                       item.productCode === productCode && 
                       item.color === color && 
                       item.size === size && 
                       item.material === material;
            });
    
            if(isCheckOption) {
                this.orderItemList[inx][name] = null;
                this.handleAlertClick('Error', '상품/색상/직경/재질이 같은 상품이 2개 있을수 없습니다.', 'error');
            }
        }
    }

    /**
     * Item 삭제 버튼 클릭시 실행되는 함수
     * @param {*} index 
     */
    handleDelete(index) {
        if(index && this.defaultValue === 'Edit') {
            this.orderItemList.splice(index, 1);
            this.deleteIdList.add(this.orderItemList.id);
        }else if(index){
            this.orderItemList.splice(index, 1);
        }
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

    /**
    * Navigation 함수
    * @param {String} recordTypeId 
    * @param {String} actoionType 
    * @param {String} actionName 
    */
    navigateToObjectHome(actionName, actionType, recordId) {
        let pageRef = {
                type: actionType,
                attributes: {
                    objectApiName: PURCHASE_ORDER_OBJECT_API_NAME,
                    actionName: actionName,
                    recordId : recordId
                }
            }
        if(pageRef) {
            this[NavigationMixin.Navigate](pageRef);
        }
    }

    /**
     * flow 창 닫는 함수
     */
    closeFlow() {
        if (this.availableActions.find((action) => action === 'FINISH')) {
            const navigateNextEvent = new FlowNavigationFinishEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }

    /**
     * 경고 창 
     * @param {String} title 
     * @param {String} message 
     * @param {String} theme 
     */
    async handleAlertClick(title, message, theme) {
        const result = await LightningAlert.open({
            label : title,
            message: message,
            theme : theme
        });
    }
    

}