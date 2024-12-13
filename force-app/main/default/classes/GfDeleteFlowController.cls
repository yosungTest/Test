public with sharing class GfDeleteFlowController {
    
    @AuraEnabled
    public static void deleteRecords(String objectName, List<Id> ids) {
        try {
            String query = 'SELECT Id FROM ' + objectName + ' WHERE Id IN :ids';
            List<SObject> recordsToDelete = Database.query(query);
            
            delete recordsToDelete;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting records: ' + e.getMessage());
        }
    }
}