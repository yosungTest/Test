public with sharing class GfWarehouseInController {

    @AuraEnabled
    public static WrapperPurchaseOrder getOrder(String recordId) {
        InventoryOutOrder__c order = [
            SELECT Id, Name, InventoryOutOrderDate__c, PurchaseVendor__c, PurchaseVendor__r.Name, NetAmount__c
            FROM InventoryOutOrder__c 
            WHERE Id = :recordId
            LIMIT 1
        ];
        return new WrapperPurchaseOrder(order);
    }

    @AuraEnabled
    public static List<WrapperPurchaseOrderItem> getOrderItems(String recordId) {
        List<InventoryOutOrderLineItem__c> items = [
            SELECT Id, Name, Product__c, Product__r.ProductCode__c, Product__r.Name, NetPrice__c, Quantity__c, 
                    SkuOption1__c, SkuOption2__c, SkuOption3__c, InventoryOutOrder__c
            FROM InventoryOutOrderLineItem__c
            WHERE InventoryOutOrder__c = :recordId
        ];

        List<WrapperPurchaseOrderItem> wrappedItems = new List<WrapperPurchaseOrderItem>();
        for (InventoryOutOrderLineItem__c item : items) {
            wrappedItems.add(new WrapperPurchaseOrderItem(item));
        }
        return wrappedItems;
    }

    public class WrapperPurchaseOrder {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public Date inventoryOutOrderDate;
        @AuraEnabled public String purchaseVendor;
        @AuraEnabled public Decimal netAmount;

        public WrapperPurchaseOrder(InventoryOutOrder__c order) {
            this.id = order.Id;
            this.name = order.Name;
            this.inventoryOutOrderDate = order.InventoryOutOrderDate__c;
            this.purchaseVendor = order.PurchaseVendor__r.Name;
            this.netAmount = order.NetAmount__c;
        }
    }

    public class WrapperPurchaseOrderItem {
        @AuraEnabled public String id;
        @AuraEnabled public String productCode;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal netPrice;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public String skuOption1;
        @AuraEnabled public String skuOption2;
        @AuraEnabled public String skuOption3;

        public WrapperPurchaseOrderItem(InventoryOutOrderLineItem__c item) {
            this.id = item.Id;
            this.productCode = item.Product__r.ProductCode__c;
            this.name = item.Product__r.Name;
            this.netPrice = item.NetPrice__c;
            this.quantity = item.Quantity__c;
            this.skuOption1 = item.SKUOption1__c;
            this.skuOption2 = item.SKUOption2__c;
            this.skuOption3 = item.SKUOption3__c;
        }
    }
}