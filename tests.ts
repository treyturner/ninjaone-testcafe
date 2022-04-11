// Notes: I had to move --openssl-legacy-provider in the start task to the end
// of the command line for node v16.14.2. Also, the UI is configured to use port
// 3000 which is also used by the backend; I'd recommend updating this to 3001
// since that's what's used in the UI README.

// Application idiosyncrasy: Attempting to create a device using a name that
// already exists will overwrite the existing record with no warning. Recommend
// checking for this and at least warning the user if not preventing the action.

import { Selector } from 'testcafe'

const api = require('./api')
const util = require('./util')

fixture`NinjaOne Demo Tests`
    .page`http://localhost:3001/`
    .beforeEach(async t => {
        // Create a reasonably unique 8 character alpha-
        // numeric String to identify test executions
        t.ctx.uid = Math.random().toString(36).substring(2, 10).toUpperCase()
    })


test
    .before(async t => {
        t.ctx.apiDevices = await api.getDevices()
    })
    ('All devices should appear on the page with correct data', async t => {
        const deviceSelector = Selector('.device-main-box')
        const deviceCount = await deviceSelector.count

        // Sanity check: ensure UI has same number of devices returned by the API
        await t
            .expect(deviceCount).eql(t.ctx.apiDevices.length)

        // Check each displayed device against the API results
        for (let i = 0; i < deviceCount; i++) {

            // Get a device off the page and references to its elements
            const deviceDiv = deviceSelector.nth(i)
            const nameDiv = deviceDiv.find('.device-name')
            const typeDiv = deviceDiv.find('.device-type')
            const capacityDiv = deviceDiv.find('.device-capacity')
            const editButton = deviceDiv.find('.device-edit')
            const removeButton = deviceDiv.find('.device-remove')

            // Get the device's data
            const device = {
                name: await nameDiv.innerText,
                type: await typeDiv.innerText,
                capacity: (await capacityDiv.innerText).split(' ')[0]
            }

            // Find the matching record from API results by name
            const apiDevice = t.ctx.apiDevices.find(d => d.system_name === device.name)

            await t
                // Assert necessary elements are displayed
                .expect(nameDiv.visible).ok()
                .expect(typeDiv.visible).ok()
                .expect(capacityDiv.visible).ok()
                .expect(editButton.visible).ok()
                .expect(removeButton.visible).ok()
                // Assert the device details are correct
                .expect(device.name).eql(apiDevice.system_name)
                .expect(device.type).eql(apiDevice.type)
                .expect(device.capacity).eql(apiDevice.hdd_capacity)
        }
    })


// BUG? Preloaded test data uses the value of type options 'value' attribute,
// ie. 'WINDOWS_WORKSTATION', but creating new records stores the innerText of
// the chosen option, ie. 'WINDOWS WORKSTATION'. Which is the correct behavior?
// This test assumes the test data is wrong and the current application behavior
// is correct. If it's not, we should edit the relevant assertion near the end
// of the test, which will cause the test to fail until the UI creates new
// records with the option's value.
test('A new device can be created', async t => {
    const testData = {
        name: `USER-${t.ctx.uid}`,
        type: 'WINDOWS_WORKSTATION',
        capacity: Math.floor(Math.random() * 1000).toString()
    }

    const button = Selector('.submitButton')
    const name = Selector('#system_name')
    const type = Selector('#type')
    const typeOption = type.child('option')
    const capacity = Selector('#hdd_capacity')

    await t
        // Load the 'Add Device' page
        .click(button)
        .expect(util.getPageUrl()).eql('http://localhost:3001/devices/add', { timeout: 3000 })
        // Fill out the form
        .typeText(name, testData.name)
        .click(type)
        .click(typeOption.withAttribute('value', testData.type))
        .typeText(capacity, testData.capacity)
        // Sanity check: ensure the form filled as expected
        .expect(name.value).eql(testData.name)
        .expect(type.value).eql(testData.type)
        .expect(capacity.value).eql(testData.capacity)
        // Create the device and ensure we're brought back to the device list
        .click(button)
        .expect(util.getPageUrl()).eql('http://localhost:3001/', { timeout: 3000 })

    // Get reference to the newly created device div using its name
    const devices = Selector('.device-main-box')
    const newDevice = devices
        .find('.device-name')
        .withText(testData.name)
        .parent('.device-main-box')
    const nameDiv = newDevice.find('.device-name')
    const typeDiv = newDevice.find('.device-type')
    const capacityDiv = newDevice.find('.device-capacity')

    const createdData = {
        name: await nameDiv.innerText,
        type: await typeDiv.innerText,
        capacity: (await capacityDiv.innerText).split(' ')[0]
    }

    await t
        // Ensure the newly created device and its attributes are visible
        .expect(newDevice.visible).ok()
        .expect(nameDiv.visible).ok()
        .expect(typeDiv.visible).ok()
        .expect(capacityDiv.visible).ok()
        // Ensure newly created device attributes are correct
        .expect(createdData.name).eql(testData.name)
        // Remove the .replace from the type assertion if
        // the bug mentioned above this test is confirmed
        .expect(createdData.type.replace(' ', '_')).eql(testData.type)
        .expect(createdData.capacity).eql(testData.capacity)
})


// Note: This is more of an API test than a UI test since we already
// confirmed the UI correctly renders data from the API. It would be more
// practical to test this using an API testing framework unless we're
// concerned about stale cache hits.
//
// Test prerequisite: At least one record exists in the system; this test
// could be hardened to create that record itself.
test
    .before(async t => {
        t.ctx.apiDevices = await api.getDevices()
    })
    ('Renaming a device via API is reflected in the UI', async t => {
        // Get the first device on the page
        const deviceDiv = Selector('.device-main-box').nth(0)
        const nameDiv = deviceDiv.find('.device-name')
        const originalName = await nameDiv.innerText
        // Transform the name to something new
        const newName = util.getNewName(originalName)
        // Get the whole record for this device
        let apiDevice = t.ctx.apiDevices.find(d => d.system_name === originalName)
        // Update the in-memory record to prepare for the API call
        apiDevice.system_name = newName
        // Update the device's name via API and reload the page
        await api.updateDevice(apiDevice)
        await util.reloadPage()
        // Get the first device's name again and assert it shows the update
        const updatedName = await nameDiv.innerText
        await t
            .expect(updatedName).eql(newName)
    })


// Same note applies as in the previous test.
// Test prerequisite: At least one record exists in the system; this test
// could be hardened to create that record itself.
test
    .before(async t => {
        t.ctx.apiDevices = await api.getDevices()
    })
    ('Deleting a device via API is reflected in the UI', async t => {
        // Get the last device on the page
        const deviceDiv = Selector('.device-main-box').nth(-1)
        const nameDiv = deviceDiv.find('.device-name')
        const name = await nameDiv.innerText
        // Find it in the API's device list
        let apiDevice = t.ctx.apiDevices.find(d => d.system_name === name)
        // Delete it and reload the page
        await api.deleteDevice(apiDevice.id)
        await util.reloadPage()
        // Setup a selector to find the device by name
        const devices = Selector('.device-main-box')
        const deletedDevice = devices.find('.device-name').withText(name).parent('.device-main-box')
        await t
            .expect(deletedDevice.exists).notOk()
    })
