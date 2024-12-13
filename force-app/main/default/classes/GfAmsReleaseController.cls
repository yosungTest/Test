public with sharing class GfAmsReleaseController {

    @AuraEnabled
    public static OrderInfoWrapperClass initRecord(String recordId) {
        OrderInfoWrapperClass resultList = new OrderInfoWrapperClass();
        try {
            InventoryOutOrder__c order = [SELECT Id,Name,Status__c,Partner__c,InventoryOutOrderDate__c,
                                            DeliveryDate__c,RequestDate__c,DeliveryCompany__c,DeliveryManager__c,PurchaseType__c,
                                            ZipCode__c,Address__c,RestofAddress__c,Description__c,PurchaseVendor__c,PurchaseOrder__c,
                                            PurchaseOrder__r.Name,PurchaseOrder__r.PurchaseVendor__r.Name,PurchaseOrder__r.Amount__c,PurchaseOrder__r.OrderDate__c
                                        FROM InventoryOutOrder__c 
                                        WHERE Id = :recordId
                                    ];
            resultList = new OrderInfoWrapperClass(order);
            
           for(InventoryOutOrderLineItem__c item : [SELECT Id,Name,InventoryOutOrder__c,TaxType__c,TaxRate__c,Quantity__c,QuantityOrder__c,
                                                        ConfirmQuantityOrder__c,NetPrice__c,Product__c,PurchaseOrderLineItem__c,SkuOption1__c,SkuOption2__c,SkuOption3__c,
                                                        Product__r.ProductCode__c,Product__r.Name
                                                    FROM InventoryOutOrderLineItem__c 
                                                    WHERE InventoryOutOrder__c = :recordId]) 
            {                   
                resultList.itemList.add(new OrderInfoItemWrapperClass(item));
            }     
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return resultList;
    }

    @AuraEnabled
    public static WrapperPurchaseOrder getPurchaseOrder(String recordId) {
        PurchaseOrder__c order = [
            SELECT Id, Name, CreatedDate, PurchaseVendor__c, PurchaseVendor__r.Name, OrderDate__c, NetAmount__c, TaxAmount__c, Amount__c, RequestDate__c,
                    ZipCode__c, Address__c, RestofAddress__c 
            FROM PurchaseOrder__c 
            WHERE Id = :recordId
            LIMIT 1
        ];
        return new WrapperPurchaseOrder(order);
    }

    @AuraEnabled
    public static List<WrapperPurchaseOrderItem> getPurchaseOrderItems(String recordId) {
        List<PurchaseOrderLineItem__c> items = [
            SELECT Id, Name, PurchaseOrder__c, UnitPrice__c, TaxRate__c, Quantity__c, ProductId__c, ProductId__r.ProductCode__c, ProductId__r.Name,
                   TaxPrice__c, NetAmount__c, TaxAmount__c, SkuOption1__c, SkuOption2__c, SkuOption3__c, 
                   SkuOption4__c, SkuOption5__c, ConfirmQuantity__c
            FROM PurchaseOrderLineItem__c
            WHERE PurchaseOrder__c = :recordId
        ];

        List<WrapperPurchaseOrderItem> wrappedItems = new List<WrapperPurchaseOrderItem>();
        for (PurchaseOrderLineItem__c item : items) {
            wrappedItems.add(new WrapperPurchaseOrderItem(item));
        }
        return wrappedItems;
    }

    @AuraEnabled
    public static String insertRecord(String record){
        String result;
        try {
            OrderInfoWrapperClass orderInfo = (OrderInfoWrapperClass)JSON.deserialize(record, OrderInfoWrapperClass.class);
            List<OrderInfoItemWrapperClass> orderInfoItemList = orderInfo.itemList;

            String todayStr = DateTime.now().format('yyyyMMdd');
            String prefix = 'RL' + todayStr;

            List<InventoryOutOrder__c> existingOrders = [
                SELECT Name 
                FROM InventoryOutOrder__c 
                WHERE Name LIKE :prefix + '%' 
                ORDER BY Name DESC 
                LIMIT 1
            ];

            Integer nextSeq = 1;
            if (!existingOrders.isEmpty()) {
                String lastName = existingOrders[0].Name;
                String lastSeqStr = lastName.substring(10, 15);
                nextSeq = Integer.valueOf(lastSeqStr) + 1;
            }

            String newName = prefix + String.valueOf(nextSeq).leftPad(5, '0');

            InventoryOutOrder__c inventoryOutOrder = new InventoryOutOrder__c(
                Name                        = newName,
                Status__c                   = 'Registration',
                Partner__c                  = orderInfo.partner,
                InventoryOutOrderDate__c    = Date.valueOf(orderInfo.releaseDate),
                DeliveryDate__c             = Date.valueOf(orderInfo.deliveryDate),
                RequestDate__c              = Date.valueOf(orderInfo.requestDate),
                DeliveryCompany__c          = orderInfo.deliveryCompany,
                DeliveryManager__c          = orderInfo.deliveryManager,
                PurchaseType__c             = orderInfo.purchaseType,
                ZipCode__c                  = orderInfo.zipCode,
                Address__c                  = orderInfo.address,
                RestofAddress__c            = orderInfo.restofAddress,
                Description__c              = orderInfo.description,
                PurchaseVendor__c           = orderInfo.purchaseVendorId,
                PurchaseOrder__c            = orderInfo.purchaseOrderId
            );
            insert inventoryOutOrder;

            List<InventoryOutOrderLineItem__c> orderItemList = new List<InventoryOutOrderLineItem__c>();
            for(OrderInfoItemWrapperClass item : orderInfoItemList) {
                InventoryOutOrderLineItem__c inventoryOutItem = new InventoryOutOrderLineItem__c();          
                inventoryOutItem.InventoryOutOrder__c = inventoryOutOrder.Id;
                inventoryOutItem.TaxType__c = 'Tax';
                inventoryOutItem.TaxRate__c = 10;
                inventoryOutItem.Quantity__c = item.quantityOrder;
                inventoryOutItem.QuantityOrder__c  = item.quantity;
                inventoryOutItem.ConfirmQuantityOrder__c  = item.quantityOrder;
                inventoryOutItem.NetPrice__c  = item.netPrice;
                inventoryOutItem.Product__c  = item.productId;
                inventoryOutItem.PurchaseOrderLineItem__c  = item.id;
                inventoryOutItem.SkuOption1__c = item.skuOption1;
                inventoryOutItem.SkuOption2__c = item.skuOption2;
                inventoryOutItem.SkuOption3__c = item.skuOption3;
                orderItemList.add(inventoryOutItem);
            }
            insert orderItemList;

            // PurchaseOrder__c의 InventoryOutOrderStatus__c 업데이트
            if (!String.isEmpty(orderInfo.purchaseOrderId)) {
                PurchaseOrder__c purchaseOrder = [
                    SELECT Id, InventoryOutOrderStatus__c
                    FROM PurchaseOrder__c
                    WHERE Id = :orderInfo.purchaseOrderId
                    LIMIT 1
                ];
                purchaseOrder.InventoryOutOrderStatus__c = 'Released';
                update purchaseOrder;
            }
            
            result = inventoryOutOrder.Id;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return result;
    }

    @AuraEnabled
    public static Map<String, Object> editRecord(String record, List<Id> deleteIdList){
        Map<String, Object> resultMap = new Map<String, Object>();
        Savepoint sp = Database.setSavepoint();
        try {
            GfAmsReleaseController modalController = new GfAmsReleaseController();
            OrderInfoWrapperClass orderInfo = (OrderInfoWrapperClass)JSON.deserialize(record, OrderInfoWrapperClass.class);
            InventoryOutOrder__c purchaseOrder = modalController.convertObjectType(orderInfo);
            update purchaseOrder;

            List<InventoryOutOrderLineItem__c> orderItemList = new List<InventoryOutOrderLineItem__c>();
            for(OrderInfoItemWrapperClass item : orderInfo.itemList) {
                InventoryOutOrderLineItem__c lineItem = modalController.convertObjectType(item);
                // if(lineItem.Id == null) {
                //    lineItem.PurchaseOrder__c = purchaseOrder.Id;
                // }
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

    private InventoryOutOrder__c convertObjectType(OrderInfoWrapperClass orderInfo) {
        InventoryOutOrder__c inventoryOutOrder = new InventoryOutOrder__c();
        if(orderInfo != null) {
            // Status__c                   = 'Registration',
            inventoryOutOrder.Id                          = orderInfo.id;
            inventoryOutOrder.Partner__c                  = orderInfo.partner;
            inventoryOutOrder.InventoryOutOrderDate__c    = Date.valueOf(orderInfo.releaseDate);
            inventoryOutOrder.DeliveryDate__c             = Date.valueOf(orderInfo.deliveryDate);
            inventoryOutOrder.RequestDate__c              = Date.valueOf(orderInfo.requestDate);
            inventoryOutOrder.DeliveryCompany__c          = orderInfo.deliveryCompany;
            inventoryOutOrder.DeliveryManager__c          = orderInfo.deliveryManager;
            inventoryOutOrder.PurchaseType__c             = orderInfo.purchaseType;
            inventoryOutOrder.ZipCode__c                  = orderInfo.zipCode;
            inventoryOutOrder.Address__c                  = orderInfo.address;
            inventoryOutOrder.RestofAddress__c            = orderInfo.restofAddress;
            inventoryOutOrder.Description__c              = orderInfo.description;
            inventoryOutOrder.PurchaseVendor__c           = orderInfo.purchaseVendorId;
            inventoryOutOrder.PurchaseOrder__c            = orderInfo.purchaseOrderId;
        }
        return inventoryOutOrder;
    }

    private InventoryOutOrderLineItem__c convertObjectType(OrderInfoItemWrapperClass item) {
        InventoryOutOrderLineItem__c inventoryOutItem = new InventoryOutOrderLineItem__c();          
        if(item != null) {    
            inventoryOutItem.Id          = item.id;
            inventoryOutItem.Quantity__c = item.quantityOrder;
            inventoryOutItem.QuantityOrder__c  = item.quantity;
            inventoryOutItem.ConfirmQuantityOrder__c  = item.quantityOrder;
            inventoryOutItem.NetPrice__c  = item.netPrice;
            inventoryOutItem.Product__c  = item.productId;
            // inventoryOutItem.InventoryOutOrder__c = item.id;
            inventoryOutItem.SkuOption1__c = item.skuOption1;
            inventoryOutItem.SkuOption2__c = item.skuOption2;
            inventoryOutItem.SkuOption3__c = item.skuOption3;
        }
        return inventoryOutItem;
    }

    public class OrderInfoWrapperClass {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String partner;
        @AuraEnabled public Date releaseDate;
        @AuraEnabled public Date deliveryDate;
        @AuraEnabled public Date requestDate;
        @AuraEnabled public String deliveryCompany;
        @AuraEnabled public String deliveryManager;
        @AuraEnabled public String zipCode;
        @AuraEnabled public String address;
        @AuraEnabled public String restofAddress;
        @AuraEnabled public String purchaseType;
        @AuraEnabled public String description;
        @AuraEnabled public String purchaseVendorId;
        @AuraEnabled public String purchaseOrderId;
        @AuraEnabled public List<OrderInfoItemWrapperClass> itemList;

        @AuraEnabled public String purchaseOrderName;
        @AuraEnabled public String purchaseOrderPurchaseVendor;
        @AuraEnabled public Decimal purchaseOrderAmount;
        @AuraEnabled public Date purchaseOrderOrderDate;

        public OrderInfoWrapperClass() {}

        public OrderInfoWrapperClass(InventoryOutOrder__c record) {
            id               = record.Id;
            name             = record.Name;
            partner          = record.Partner__c;
            releaseDate      = record.InventoryOutOrderDate__c;
            deliveryDate     = record.DeliveryDate__c;
            requestDate      = record.RequestDate__c;
            deliveryCompany  = record.DeliveryCompany__c;
            deliveryManager  = record.DeliveryManager__c;
            zipCode          = record.ZipCode__c;
            address          = record.Address__c;
            restofAddress    = record.RestofAddress__c;
            purchaseType     = record.PurchaseType__c;
            description      = record.Description__c;
            purchaseVendorId = record.PurchaseVendor__c;
            purchaseOrderId  = record.PurchaseOrder__c;
            itemList = new List<OrderInfoItemWrapperClass>();

            purchaseOrderName = record.PurchaseOrder__r.Name;
            purchaseOrderPurchaseVendor = record.PurchaseOrder__r.PurchaseVendor__r.Name;
            purchaseOrderAmount = record.PurchaseOrder__r.Amount__c;
            purchaseOrderOrderDate = record.PurchaseOrder__r.OrderDate__c;
        }

    }

    public class OrderInfoItemWrapperClass {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal netPrice;
        @AuraEnabled public String productId;
        @AuraEnabled public String skuOption1;
        @AuraEnabled public String skuOption2;
        @AuraEnabled public String skuOption3;
        @AuraEnabled public String goodsCode;
        @AuraEnabled public Decimal quantityOrder;


        @AuraEnabled public String taxType;
        @AuraEnabled public Decimal taxRate;
        @AuraEnabled public String InventoryOutOrder;

        public OrderInfoItemWrapperClass() {

        }

        public OrderInfoItemWrapperClass(InventoryOutOrderLineItem__c record) {
            this.id             = record.Id;
            this.name           = record.Product__r.Name;
            this.quantity       = record.QuantityOrder__c;
            this.netPrice       = record.NetPrice__c;
            this.skuOption1     = record.SkuOption1__c;
            this.skuOption2     = record.SkuOption2__c;
            this.skuOption3     = record.SkuOption3__c;
            this.productId      = record.Product__c;
            this.taxType      = record.TaxType__c;
            this.taxRate      = record.TaxRate__c;
            this.goodsCode      = record.Product__r.ProductCode__c;
            this.quantityOrder  = record.Quantity__c;
        }
    }

    @AuraEnabled
    public static Map<String, String> getPurchaseTypePicklist(){
        Schema.DescribeFieldResult fieldResult    = InventoryOutOrder__c.PurchaseType__c.getDescribe();
        List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();
        Map<String, String> resultMap             = new Map<String, String>();
        for(Schema.PicklistEntry entry : picklistValues){
            resultMap.put(entry.label, entry.value);
        }
        return resultMap;
    }

    public class WrapperPurchaseOrder {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String purchaseVendor;
        @AuraEnabled public Date purchaseDate;
        @AuraEnabled public Decimal netAmount;
        @AuraEnabled public Decimal taxAmount;
        @AuraEnabled public Decimal amount;
        @AuraEnabled public String purchaseVendorId;
        @AuraEnabled public Date requestDate;
        @AuraEnabled public String zipCode;
        @AuraEnabled public String address;
        @AuraEnabled public String restofAddress;

        public WrapperPurchaseOrder(PurchaseOrder__c order) {
            this.id = order.Id;
            this.name = order.Name;
            this.purchaseVendor = order.PurchaseVendor__r.Name;
            this.purchaseDate = order.OrderDate__c;
            this.netAmount = order.NetAmount__c;
            this.taxAmount = order.TaxAmount__c;
            this.amount = order.Amount__c;
            this.purchaseVendorId = order.PurchaseVendor__c;
            this.requestDate = order.RequestDate__c;
            this.zipCode = order.ZipCode__c;
            this.address = order.Address__c;
            this.restofAddress = order.RestofAddress__c;
        }
    }

    public class WrapperPurchaseOrderItem {
        @AuraEnabled public String id;
        @AuraEnabled public String goodsCode;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal netPrice;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public String skuOption;
        @AuraEnabled public String skuOption1;
        @AuraEnabled public String skuOption2;
        @AuraEnabled public String skuOption3;
        @AuraEnabled public String purchaseOrder;
        @AuraEnabled public String productId;

        public WrapperPurchaseOrderItem(PurchaseOrderLineItem__c item) {
            this.id = item.Id;
            this.goodsCode = item.ProductId__r.ProductCode__c;
            this.name = item.ProductId__r.Name;
            this.netPrice = item.UnitPrice__c;
            this.quantity = item.ConfirmQuantity__c;
            this.skuOption = item.SKUOption1__c+'-'+item.SKUOption2__c+'-'+item.SKUOption3__c;
            this.skuOption1 = item.SKUOption1__c;
            this.skuOption2 = item.SKUOption2__c;
            this.skuOption3 = item.SKUOption3__c;
            this.purchaseOrder = item.PurchaseOrder__c;
            this.productId = item.ProductId__c;
        }
    }
}