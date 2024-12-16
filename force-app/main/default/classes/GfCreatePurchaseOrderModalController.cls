public with sharing class GfCreatePurchaseOrderModalController {

    private static final String PURCHASE_ORDER_OBJECT_NAME = 'PurchaseOrder__c';
    private static final String PURCHASE_ORDER_LINE_ITEM_OBJECT_NAME = 'PurchaseOrderLineItem__c';
    /**
     * 화면 생성시 초기 PickList Field 생성 메서드
     * @param {String} objectName 
     * @param {List<String>} pickListFieldName 
     * @return  `Map<String, Object>`
     * @exception 
     */
    @AuraEnabled
    public static Map<String, Object> settingPickListOptions( List<String> purchasePickListFiledName, List<String> purchaseItemPickListFiledName){
        Map<String, Object> resultMap = new Map<String, Object>();
        try {
            gfUtilController utilContoller = new gfUtilController();
            resultMap = new Map<String, Object> {
                PURCHASE_ORDER_OBJECT_NAME => utilContoller.getPickListOptions(PURCHASE_ORDER_OBJECT_NAME, purchasePickListFiledName),
                PURCHASE_ORDER_LINE_ITEM_OBJECT_NAME => utilContoller.getPickListOptions(PURCHASE_ORDER_LINE_ITEM_OBJECT_NAME, purchaseItemPickListFiledName)
            };
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return resultMap;
    }

    /**
     * 데이터 수정 화면 저장된 데이터 불러오는 메서드
     * @param {String} objectName 
     * @param {List<String>} pickListFieldName 
     * @return  `Map<String, Object>`
     * @exception 
     */
    @AuraEnabled
    public static OrderInfoWrapperClass initRecord(String recordId) {
        OrderInfoWrapperClass resultList = new OrderInfoWrapperClass();
        try {
            PurchaseOrder__c order = [SELECT Id, Name, OrderDate__c, PurchaseVendor__c, 
                                             RequestDate__c, OrderType__c, PartnerId__c,
                                            ZipCode__c,Address__c, RestofAddress__c, 
                                            RequestedBy__c, SpecialTerms__c 
                                      FROM PurchaseOrder__c 
                                      WHERE Id = :recordId
                                    ];
            resultList = new OrderInfoWrapperClass(order);
            
           for(PurchaseOrderLineItem__c item : [SELECT Id, ProductCode__c, ProductId__c, Quantity__c, Tax_Type__c,
                                                       ProductId__r.Name, Unit__c, UnitPrice__c, TotalAmount__c, TaxRate__c,
                                                       SkuOption1__c, SkuOption2__c, SkuOption3__c, PurchaseOrder__c 
                                                FROM PurchaseOrderLineItem__c WHERE PurchaseOrder__c = :recordId]) 
            {
                resultList.itemList.add(new OrderInfoItemWrapperClass(item));
            }     
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return resultList;
    }

    /**
     * 데이터 저장 메서드
     * @param {String} record 
     * @exception 
     */
    @AuraEnabled
    public static String insertRecord(String record){
        String result;
        try {
            GfCreatePurchaseOrderModalController modalController = new GfCreatePurchaseOrderModalController();
            OrderInfoWrapperClass orderInfo = (OrderInfoWrapperClass)JSON.deserialize(record, OrderInfoWrapperClass.class);
            PurchaseOrder__c purchaseOrder = modalController.convertObjectType(orderInfo);
            insert purchaseOrder;

            List<PurchaseOrderLineItem__c> orderItemList = new List<PurchaseOrderLineItem__c>();
            for(OrderInfoItemWrapperClass item : orderInfo.itemList) {
                PurchaseOrderLineItem__c lineItem = modalController.convertObjectType(item);
                lineItem.PurchaseOrder__c         = purchaseOrder.Id;
                orderItemList.add(lineItem);
            }

            insert orderItemList;

            result = purchaseOrder.Id;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return result;
    }

    /**
     * 데이터 저장 메서드
     * @param {String} record 
     * @exception 
     */
    @AuraEnabled
    public static Map<String, Object> editRecord(String record, List<Id> deleteIdList){
        Map<String, Object> resultMap = new Map<String, Object>();
        Savepoint sp = Database.setSavepoint();
        try {
            GfCreatePurchaseOrderModalController modalController = new GfCreatePurchaseOrderModalController();
            OrderInfoWrapperClass orderInfo = (OrderInfoWrapperClass)JSON.deserialize(record, OrderInfoWrapperClass.class);
            PurchaseOrder__c purchaseOrder = modalController.convertObjectType(orderInfo);
            update purchaseOrder;

            List<PurchaseOrderLineItem__c> orderItemList = new List<PurchaseOrderLineItem__c>();
            for(OrderInfoItemWrapperClass item : orderInfo.itemList) {
                PurchaseOrderLineItem__c lineItem = modalController.convertObjectType(item);
                if(lineItem.Id == null) {
                   lineItem.PurchaseOrder__c = purchaseOrder.Id;
                }
                orderItemList.add(lineItem);
            }
            upsert orderItemList;
            
            if(deleteIdList.size() > 0) {
                if(deleteIdList != null) {
                    Database.DeleteResult[] drList = Database.delete(deleteIdList, false);
                    for(Database.DeleteResult dr : drList) {
                        if (dr.isSuccess()) {
                            resultMap.put('isSuccess', purchaseOrder.Id);
                        }
                        else {           
                            for(Database.Error err : dr.getErrors()) {
                                String errorMsg = err.getStatusCode() + ':' +  err.getFields() + ': ' + err.getMessage();
                                resultMap.put('errorMsg', errorMsg);
                                Database.rollback(sp);
                            }
                        }
                    }
                }
            }else {
                resultMap.put('isSuccess', purchaseOrder.Id);
            }
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException(e.getMessage());
        }
        return resultMap;
    }

    /**
     * 레코트를 PurchaseOrder__c 오브젝트 형식으로 변형 하는 메서드
     */
    private PurchaseOrder__c convertObjectType(OrderInfoWrapperClass record) {
        PurchaseOrder__c purchaseOrder = new PurchaseOrder__c();
        if(record != null) {
            purchaseOrder.Id                      = record.id;
            purchaseOrder.Name                    = record.orderNumber;
            purchaseOrder.ZipCode__c              = record.zipCode;
            purchaseOrder.Address__c              = record.address;
            purchaseOrder.RestofAddress__c        = record.addressDetail;
            purchaseOrder.RequestedBy__c          = record.registor;
            purchaseOrder.SpecialTerms__c         = record.description;
            purchaseOrder.RequestDate__c          = record.requestDate;
            purchaseOrder.OrderDate__c            = record.purchaseDate;
            purchaseOrder.PurchaseVendor__c       = String.isNotBlank(record.purchaseVender) ? record.purchaseVender : null;
            purchaseOrder.PartnerId__c            = String.isNotBlank(record.partnerId) ? record.partnerId : null;
        }
        return purchaseOrder;
    }

    /**
     * 레코트를 PurchaseOrderLineItem__c 오브젝트 형식으로 변형 하는 메서드
     */
    private PurchaseOrderLineItem__c convertObjectType(OrderInfoItemWrapperClass record) {
        PurchaseOrderLineItem__c purchaseItem = new PurchaseOrderLineItem__c();          
        if(record != null) {
            purchaseItem.Id                     = record.id;
            purchaseItem.ProductId__c           = record.productId;
            purchaseItem.Quantity__c            = record.quantity;
            purchaseItem.Unit__c                = record.unit;
            purchaseItem.UnitPrice__c           = record.productPrice;
            purchaseItem.SkuOption1__c          = record.color;
            purchaseItem.SkuOption2__c          = record.size;
            purchaseItem.SkuOption3__c          = record.material;
            purchaseItem.Tax_Type__c            = record.taxType;
            purchaseItem.TaxRate__c             = record.taxRate;
           // purchaseItem.PurchaseOrder__c       = String.isNotBlank(record.purchaseOrder) ? record.purchaseOrder  : null;
        }
        return purchaseItem;
    }

    public class OrderInfoWrapperClass {
        @AuraEnabled public String id;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public String purchaseVender;
        @AuraEnabled public String partnerId;
        @AuraEnabled public Date requestDate;
        @AuraEnabled public Date purchaseDate;
        @AuraEnabled public String orderType;
        @AuraEnabled public String zipCode;
        @AuraEnabled public String address;
        @AuraEnabled public String addressDetail;
        @AuraEnabled public String registor;
        @AuraEnabled public String description;
        @AuraEnabled public List<OrderInfoItemWrapperClass> itemList;

        public OrderInfoWrapperClass() {}

        public OrderInfoWrapperClass(PurchaseOrder__c record) {
            id              = record.Id;
            orderNumber     = record.Name;
            purchaseDate    = record.OrderDate__c;
            purchaseVender  = record.PurchaseVendor__c;
            partnerId       = record.PartnerId__c;
            requestDate     = record.RequestDate__c;
            orderType       = record.OrderType__c;
            zipCode         = record.ZipCode__c;
            address         = record.Address__c;
            addressDetail   = record.RestofAddress__c;
            registor        = record.RequestedBy__c;
            description     = record.SpecialTerms__c;
            itemList = new List<OrderInfoItemWrapperClass>();
        }

    }

    public class OrderInfoItemWrapperClass {
        @AuraEnabled public String id;
        @AuraEnabled public String productId;
        @AuraEnabled public String productName;
        @AuraEnabled public String productCode;
        @AuraEnabled public String productUrl; 
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal productPrice;
        @AuraEnabled public String totalPrice;
        @AuraEnabled public Double taxRate;
        @AuraEnabled public String unit;
        @AuraEnabled public String taxType;
        @AuraEnabled public String color;
        @AuraEnabled public String size;
        @AuraEnabled public String material;
        @AuraEnabled public String purchaseOrder;

        public OrderInfoItemWrapperClass() {

        }

        public OrderInfoItemWrapperClass(PurchaseOrderLineItem__c record) {
            this.id             = record.Id;
            this.productId      = record.ProductId__c;
            this.productName    = String.isNotBlank(record.ProductId__c) ? record.ProductId__r.Name : null;
            this.productCode    = record.ProductCode__c;
            this.productUrl     = makeRecordURL(record.ProductId__c);
            this.quantity       = record.Quantity__c;
            this.productPrice   = record.UnitPrice__c;
            this.totalPrice     = String.valueOf(record.TotalAmount__c);
            this.taxRate        = record.TaxRate__c;
            this.unit           = record.Unit__c;
            this.taxType        = record.Tax_Type__c;
            this.color          = record.SkuOption1__c;
            this.size           = record.SkuOption2__c;
            this.material       = record.SkuOption3__c;
            this.purchaseOrder  = record.PurchaseOrder__c;
        }

        private String makeRecordURL(Id recordId) {
            return URL.getOrgDomainURL().toExternalForm() + '/' + recordId;
        }

    }

}