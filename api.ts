import axios from 'axios'

module.exports = {
    // GET all devices from the API
    getDevices: function () {
        return axios
            .get('http://localhost:3000/devices')
            .then(res => {
                return res.data
            })
    },


    // Make a PUT request to the API to update a device
    updateDevice: function (updatedRecord) {
        return axios
            .put(`http://localhost:3000/devices/${updatedRecord.id}`, {
                id: updatedRecord.id,
                system_name: updatedRecord.system_name,
                hdd_capacity: updatedRecord.hdd_capacity,
                type: updatedRecord.type
            })
            .catch(error => {
                console.error('Error updating device via API:')
                console.error(error.toJSON())
            })
    },

    // DELETE a device via the API
    deleteDevice: function (id) {
        return axios
            .delete(`http://localhost:3000/devices/${id}`)
            .catch(error => {
                console.error('Error deleting device via API:')
                console.error(error.toJSON())
            })
    }
}
